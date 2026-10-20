import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, LogBox } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';

import {
  ANNOUNCEMENT_COOLDOWN_MS,
  STABLE_HISTORY_SIZE,
  STABLE_MIN_MATCHES,
  formatDetection,
} from './src/detection';
import {
  GEMINI_MODEL_NAME,
  GEMINI_SCAN_INTERVAL_MS,
  analyzeGeminiSnapshot,
  deleteSnapshotFile,
} from './src/geminiVision';
import { MODEL_PLUGINS } from './src/modelRegistry';
import { VisionMateView } from './src/VisionMateView';

LogBox.ignoreLogs(['Open debugger to view warnings']);

const GEMINI_API_KEY_STORAGE_KEY = 'visionmate.geminiApiKey';

export default function App() {
  const [selectedModelKey, setSelectedModelKey] = useState('yolo11n');
  const [activeScreen, setActiveScreen] = useState('detect');
  const [switchProgress, setSwitchProgress] = useState(100);
  const [engineStarted, setEngineStarted] = useState(false);
  const [model, setModel] = useState({ model: undefined, state: 'idle' });
  const [cameraState, setCameraState] = useState({ hasPermission: true, hasDevice: true });
  const [detections, setDetections] = useState([]);
  const [announcementsEnabled, setAnnouncementsEnabled] = useState(true);
  const [lastAnnouncement, setLastAnnouncement] = useState('Point the camera at nearby objects.');
  const [speechStatus, setSpeechStatus] = useState('Voice ready');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiKeyDraft, setGeminiKeyDraft] = useState('');
  const [geminiStatus, setGeminiStatus] = useState('Gemini key not saved');

  const lastSpokenRef = useRef('');
  const lastSpokenAtRef = useRef(0);
  const captureSnapshotRef = useRef(null);
  const detectionHistoryRef = useRef([]);
  const announcementPendingRef = useRef(false);
  const geminiBusyRef = useRef(false);
  const geminiTimerRef = useRef(null);
  const speechRunIdRef = useRef(0);
  const speechBusyRef = useRef(false);
  const speechFallbackTimerRef = useRef(null);
  const switchTimersRef = useRef([]);

  const selectedPlugin = useMemo(
    () => MODEL_PLUGINS.find((plugin) => plugin.key === selectedModelKey) ?? MODEL_PLUGINS[0],
    [selectedModelKey]
  );
  const isGeminiSelected = selectedPlugin.parser === 'gemini';
  const modelSlots = useMemo(() => {
    return MODEL_PLUGINS.reduce((slots, plugin) => {
      slots[plugin.key] = plugin.key === selectedPlugin.key
        ? model
        : { model: undefined, state: 'idle' };
      return slots;
    }, {});
  }, [model, selectedPlugin.key]);

  const modelStatus = useMemo(() => {
    if (!engineStarted) {
      return 'Ready to start';
    }

    if (isGeminiSelected && model?.state === 'loaded') {
      return geminiApiKey ? `${selectedPlugin.shortLabel} ready` : 'Gemini needs key';
    }

    if (model?.state === 'loaded') {
      return `${selectedPlugin.shortLabel} ready`;
    }

    if (model?.state === 'error') {
      return `${selectedPlugin.shortLabel} error`;
    }

    return `Loading ${selectedPlugin.shortLabel}`;
  }, [engineStarted, geminiApiKey, isGeminiSelected, model?.state, selectedPlugin.shortLabel]);

  useEffect(() => {
    let isMounted = true;

    async function loadGeminiKey() {
      try {
        const storedKey = await SecureStore.getItemAsync(GEMINI_API_KEY_STORAGE_KEY);
        if (isMounted && storedKey) {
          setGeminiApiKey(storedKey);
          setGeminiKeyDraft(storedKey);
          setGeminiStatus(`${GEMINI_MODEL_NAME} key saved`);
        }
      } catch (error) {
        if (isMounted) {
          setGeminiStatus('Could not load Gemini key');
        }
      }
    }

    loadGeminiKey();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setDetections([]);
    detectionHistoryRef.current = [];
    lastSpokenRef.current = '';
    lastSpokenAtRef.current = 0;
    setLastAnnouncement(`Using ${selectedPlugin.label}. Point the camera at nearby objects.`);
  }, [selectedPlugin.label]);

  useEffect(() => {
    return () => {
      switchTimersRef.current.forEach(clearTimeout);
      if (geminiTimerRef.current != null) {
        clearInterval(geminiTimerRef.current);
      }
    };
  }, []);

  const speak = useCallback(async (message, interrupt = false) => {
    const spokenMessage = message?.trim();
    if (!spokenMessage) {
      return false;
    }

    if (!announcementsEnabled && !interrupt) {
      return false;
    }

    try {
      if (!interrupt && speechBusyRef.current) {
        return false;
      }

      const isAlreadySpeaking = await Speech.isSpeakingAsync();
      if (isAlreadySpeaking && !interrupt) {
        setSpeechStatus('Speaking');
        return false;
      }

      const speechRunId = speechRunIdRef.current + 1;
      speechRunIdRef.current = speechRunId;

      setSpeechStatus('Preparing voice');
      if (interrupt || isAlreadySpeaking) {
        await Speech.stop();
      }

      if (speechRunId !== speechRunIdRef.current) {
        return false;
      }

      speechBusyRef.current = true;
      if (speechFallbackTimerRef.current != null) {
        clearTimeout(speechFallbackTimerRef.current);
      }
      speechFallbackTimerRef.current = setTimeout(() => {
        if (speechRunId === speechRunIdRef.current) {
          speechBusyRef.current = false;
          setSpeechStatus('Voice ready');
        }
      }, Math.max(2500, spokenMessage.length * 90));

      Speech.speak(spokenMessage, {
        pitch: 1,
        rate: 0.85,
        onStart: () => {
          if (speechRunId === speechRunIdRef.current) {
            setSpeechStatus('Speaking');
          }
        },
        onDone: () => {
          if (speechRunId === speechRunIdRef.current) {
            clearTimeout(speechFallbackTimerRef.current);
            speechBusyRef.current = false;
            setSpeechStatus('Voice ready');
          }
        },
        onStopped: () => {
          if (speechRunId === speechRunIdRef.current) {
            clearTimeout(speechFallbackTimerRef.current);
            speechBusyRef.current = false;
            setSpeechStatus('Voice ready');
          }
        },
        onError: () => {
          if (speechRunId === speechRunIdRef.current) {
            clearTimeout(speechFallbackTimerRef.current);
            speechBusyRef.current = false;
            setSpeechStatus('Voice error');
          }
        },
      });
      AccessibilityInfo.announceForAccessibility(spokenMessage);
      return true;
    } catch (error) {
      speechBusyRef.current = false;
      setSpeechStatus('Voice error');
      return false;
    }
  }, [announcementsEnabled]);

  const maybeAnnounceDetection = useCallback((nextDetections) => {
    setDetections(nextDetections);

    const bestDetection = nextDetections[0];
    if (bestDetection == null) {
      detectionHistoryRef.current = [];
      return;
    }

    const history = detectionHistoryRef.current;
    history.push(bestDetection.label);
    if (history.length > STABLE_HISTORY_SIZE) {
      history.shift();
    }

    const seenCount = history.filter((label) => label === bestDetection.label).length;
    if (seenCount < STABLE_MIN_MATCHES) {
      return;
    }

    const now = Date.now();
    const spokenText = formatDetection(bestDetection);
    const shouldSpeak =
      spokenText !== lastSpokenRef.current ||
      now - lastSpokenAtRef.current > ANNOUNCEMENT_COOLDOWN_MS;

    if (!shouldSpeak || announcementPendingRef.current) {
      return;
    }

    announcementPendingRef.current = true;
    speak(spokenText).then((didSpeak) => {
      if (didSpeak) {
        lastSpokenRef.current = spokenText;
        lastSpokenAtRef.current = Date.now();
        setLastAnnouncement(spokenText);
      }
    }).finally(() => {
      announcementPendingRef.current = false;
    });
  }, [speak]);

  const handleGeminiText = useCallback((spokenText) => {
    const cleanText = spokenText?.trim();
    if (!cleanText) {
      return;
    }

    const now = Date.now();
    const shouldSpeak =
      cleanText !== lastSpokenRef.current ||
      now - lastSpokenAtRef.current > ANNOUNCEMENT_COOLDOWN_MS;

    setDetections([
      {
        id: `gemini-${now}`,
        label: cleanText,
        source: 'gemini',
        confidence: 1,
        box: {
          x: 0,
          y: 0,
          width: 1,
          height: 1,
        },
      },
    ]);

    if (!shouldSpeak || announcementPendingRef.current) {
      return;
    }

    announcementPendingRef.current = true;
    speak(cleanText).then((didSpeak) => {
      if (didSpeak) {
        lastSpokenRef.current = cleanText;
        lastSpokenAtRef.current = Date.now();
        setLastAnnouncement(cleanText);
      }
    }).finally(() => {
      announcementPendingRef.current = false;
    });
  }, [speak]);

  const runGeminiScan = useCallback(async () => {
    if (!geminiApiKey.trim()) {
      setGeminiStatus('Paste and save your Gemini key');
      return;
    }

    if (geminiBusyRef.current || captureSnapshotRef.current == null) {
      return;
    }

    geminiBusyRef.current = true;
    let photoPath = null;
    try {
      setGeminiStatus('Gemini looking');
      const photo = await captureSnapshotRef.current();
      photoPath = photo?.path;
      const text = await analyzeGeminiSnapshot(photoPath, geminiApiKey);
      setGeminiStatus(`${GEMINI_MODEL_NAME} ready`);
      handleGeminiText(text);
    } catch (error) {
      setGeminiStatus(error?.message ?? 'Gemini request failed');
    } finally {
      geminiBusyRef.current = false;
      deleteSnapshotFile(photoPath).catch(() => {});
    }
  }, [geminiApiKey, handleGeminiText]);

  useEffect(() => {
    if (
      !engineStarted ||
      activeScreen !== 'detect' ||
      !isGeminiSelected ||
      model?.state !== 'loaded'
    ) {
      if (geminiTimerRef.current != null) {
        clearInterval(geminiTimerRef.current);
        geminiTimerRef.current = null;
      }
      geminiBusyRef.current = false;
      return undefined;
    }

    const firstScanTimer = setTimeout(runGeminiScan, 900);
    geminiTimerRef.current = setInterval(runGeminiScan, GEMINI_SCAN_INTERVAL_MS);

    return () => {
      clearTimeout(firstScanTimer);
      if (geminiTimerRef.current != null) {
        clearInterval(geminiTimerRef.current);
        geminiTimerRef.current = null;
      }
    };
  }, [activeScreen, engineStarted, isGeminiSelected, model?.state, runGeminiScan]);

  useEffect(() => {
    return () => {
      speechRunIdRef.current += 1;
      if (speechFallbackTimerRef.current != null) {
        clearTimeout(speechFallbackTimerRef.current);
      }
      if (geminiTimerRef.current != null) {
        clearInterval(geminiTimerRef.current);
      }
      announcementPendingRef.current = false;
      geminiBusyRef.current = false;
      speechBusyRef.current = false;
      Speech.stop();
    };
  }, []);

  const repeatLastAnnouncement = () => {
    speak(lastAnnouncement, true);
  };

  const testVoice = () => {
    speak('Voice guidance is working.', true);
  };

  const toggleAnnouncements = () => {
    setAnnouncementsEnabled((current) => {
      const next = !current;
      const message = next ? 'Voice guidance on' : 'Voice guidance off';
      speak(message, true);
      return next;
    });
  };

  const startEngine = () => {
    setEngineStarted(true);
    setModel({ model: undefined, state: 'loading' });
    setLastAnnouncement(`Starting ${selectedPlugin.label}.`);
  };

  const handleModelStateChange = useCallback((nextModel) => {
    setModel(nextModel);
  }, []);

  const handleCameraStateChange = useCallback((nextCameraState) => {
    setCameraState(nextCameraState);
  }, []);

  const handleSnapshotReady = useCallback((captureSnapshot) => {
    captureSnapshotRef.current = captureSnapshot;
  }, []);

  const saveGeminiApiKey = useCallback(async () => {
    const cleanKey = geminiKeyDraft.trim();
    if (!cleanKey) {
      setGeminiStatus('Enter a Gemini API key first');
      return;
    }

    try {
      await SecureStore.setItemAsync(GEMINI_API_KEY_STORAGE_KEY, cleanKey);
      setGeminiApiKey(cleanKey);
      setGeminiStatus(`${GEMINI_MODEL_NAME} key saved`);
    } catch (error) {
      setGeminiStatus('Could not save Gemini key');
    }
  }, [geminiKeyDraft]);

  const clearGeminiApiKey = useCallback(async () => {
    try {
      await SecureStore.deleteItemAsync(GEMINI_API_KEY_STORAGE_KEY);
    } finally {
      setGeminiApiKey('');
      setGeminiKeyDraft('');
      setGeminiStatus('Gemini key removed');
    }
  }, []);

  const selectModel = (modelKey) => {
    if (modelKey === selectedModelKey) {
      return;
    }

    switchTimersRef.current.forEach(clearTimeout);
    switchTimersRef.current = [];
    setSwitchProgress(18);
    setDetections([]);
    captureSnapshotRef.current = null;
    geminiBusyRef.current = false;
    setModel({ model: undefined, state: engineStarted ? 'loading' : 'idle' });
    setSelectedModelKey(modelKey);

    switchTimersRef.current = [
      setTimeout(() => setSwitchProgress(62), 220),
      setTimeout(() => setSwitchProgress(100), 560),
    ];
  };

  const DetectionEngine = engineStarted
    ? require('./src/DetectionEngine').DetectionEngine
    : null;
  const cameraLayer = DetectionEngine ? (
    <DetectionEngine
      activeScreen={activeScreen}
      isEnabled={engineStarted}
      onCameraStateChange={handleCameraStateChange}
      onDetections={maybeAnnounceDetection}
      onModelStateChange={handleModelStateChange}
      onSnapshotReady={handleSnapshotReady}
      selectedPlugin={selectedPlugin}
      switchProgress={switchProgress}
    />
  ) : null;

  const isSwitchingModel = engineStarted && (switchProgress < 100 || model?.state !== 'loaded');
  const loadingProgress = model?.state === 'loading' ? Math.min(switchProgress, 42) : switchProgress;
  const loadingText = isSwitchingModel
    ? `Loading ${selectedPlugin.label} - ${Math.min(loadingProgress, 99)}%`
    : '';
  const modelProgressText = isSwitchingModel
    ? `Switching to ${selectedPlugin.label} - ${Math.min(loadingProgress, 99)}%`
    : engineStarted
      ? `${selectedPlugin.label} active`
      : `Tap Start to load ${selectedPlugin.label}`;

  return (
    <VisionMateView
      activeScreen={activeScreen}
      announcementsEnabled={announcementsEnabled}
      cameraLayer={cameraLayer}
      engineStarted={engineStarted}
      detections={detections}
      hasDevice={cameraState.hasDevice}
      hasPermission={cameraState.hasPermission}
      geminiApiKey={geminiKeyDraft}
      geminiStatus={geminiStatus}
      lastAnnouncement={lastAnnouncement}
      loadingProgress={loadingProgress}
      loadingText={loadingText}
      model={model}
      modelProgressText={modelProgressText}
      modelSlots={modelSlots}
      modelStatus={modelStatus}
      repeatLastAnnouncement={repeatLastAnnouncement}
      saveGeminiApiKey={saveGeminiApiKey}
      selectModel={selectModel}
      selectedPlugin={selectedPlugin}
      setActiveScreen={setActiveScreen}
      setGeminiApiKey={setGeminiKeyDraft}
      speechStatus={speechStatus}
      startEngine={startEngine}
      switchProgress={switchProgress}
      testVoice={testVoice}
      toggleAnnouncements={toggleAnnouncements}
      clearGeminiApiKey={clearGeminiApiKey}
    />
  );
}
