import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  runAtTargetFps,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { loadTensorflowModel } from 'react-native-fast-tflite';
import { useRunOnJS } from 'react-native-worklets-core';
import { useResizePlugin } from 'vision-camera-resize-plugin';

import { DETECTION_FPS, normalizeDetections } from './detection';

const MODEL_ASSETS = {
  yolo11n: require('../models/yolo11n.tflite'),
  efficientdet: require('../models/efficientdet_lite2_detection.tflite'),
  ssd: require('../models/ssd_mobilenet_v1.tflite'),
};

export function DetectionEngine({
  activeScreen,
  isEnabled,
  onCameraStateChange,
  onDetections,
  onModelStateChange,
  onSnapshotReady,
  selectedPlugin,
  switchProgress,
}) {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const cameraRef = useRef(null);
  const { resize } = useResizePlugin();
  const [model, setModel] = useState({ model: undefined, state: 'loading' });
  const isGemini = selectedPlugin.parser === 'gemini';

  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    onCameraStateChange({
      hasDevice: device != null,
      hasPermission,
    });
  }, [device, hasPermission, onCameraStateChange]);

  useEffect(() => {
    let isMounted = true;

    async function loadSelectedModel() {
      const loadingState = { model: undefined, state: 'loading' };
      setModel(loadingState);
      onModelStateChange(loadingState);

      try {
        if (isGemini) {
          const loadedState = { model: null, state: 'loaded' };
          setModel(loadedState);
          onModelStateChange(loadedState);
          return;
        }

        const modelAsset = MODEL_ASSETS[selectedPlugin.key];
        if (modelAsset == null) {
          throw new Error(`No model asset found for ${selectedPlugin.label}`);
        }

        const loadedModel = await loadTensorflowModel(modelAsset);

        if (isMounted) {
          const loadedState = { model: loadedModel, state: 'loaded' };
          setModel(loadedState);
          onModelStateChange(loadedState);
        }
      } catch (error) {
        if (isMounted) {
          const errorState = { model: undefined, state: 'error', error };
          setModel(errorState);
          onModelStateChange(errorState);
        }
      }
    }

    loadSelectedModel();

    return () => {
      isMounted = false;
    };
  }, [isGemini, onModelStateChange, selectedPlugin.key, selectedPlugin.label]);

  useEffect(() => {
    if (!isGemini || !isEnabled || !hasPermission || device == null) {
      onSnapshotReady?.(null);
      return undefined;
    }

    onSnapshotReady?.(async () => {
      const camera = cameraRef.current;
      if (camera == null) {
        throw new Error('Camera is not ready yet.');
      }

      return camera.takeSnapshot({ quality: 70 });
    });

    return () => {
      onSnapshotReady?.(null);
    };
  }, [device, hasPermission, isEnabled, isGemini, onSnapshotReady]);

  const updateDetectionsOnJS = useRunOnJS(onDetections, [onDetections]);
  const actualModel = !isGemini && model?.state === 'loaded' && switchProgress === 100
    ? model.model
    : undefined;
  const selectedInputSize = selectedPlugin.inputSize;
  const selectedDataType = selectedPlugin.dataType;
  const selectedParser = selectedPlugin.parser;
  const selectedOutputMap = selectedPlugin.outputMap;
  const selectedClassOffset = selectedPlugin.classOffset ?? 0;
  const selectedConfidenceThreshold = selectedPlugin.confidenceThreshold ?? 0.55;

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';

      if (isGemini || actualModel == null) {
        return;
      }

      runAtTargetFps(DETECTION_FPS, () => {
        'worklet';

        try {
          const resized = resize(frame, {
            scale: {
              width: selectedInputSize,
              height: selectedInputSize,
            },
            pixelFormat: 'rgb',
            dataType: selectedDataType,
          });
          const outputs = actualModel.runSync([resized]);
          const nextDetections = normalizeDetections(
            outputs,
            selectedParser,
            selectedInputSize,
            selectedOutputMap,
            selectedClassOffset,
            selectedConfidenceThreshold
          );
          updateDetectionsOnJS(nextDetections);
        } catch (error) {
          updateDetectionsOnJS([]);
        }
      });
    },
    [
      actualModel,
      isGemini,
      resize,
      selectedClassOffset,
      selectedConfidenceThreshold,
      selectedDataType,
      selectedInputSize,
      selectedOutputMap,
      selectedParser,
      updateDetectionsOnJS,
    ]
  );

  if (!isEnabled || !hasPermission || device == null) {
    return null;
  }

  return (
    <Camera
      ref={cameraRef}
      androidPreviewViewType="texture-view"
      device={device}
      frameProcessor={actualModel ? frameProcessor : undefined}
      isActive={activeScreen === 'detect' && (isGemini || actualModel != null)}
      pixelFormat="yuv"
      style={StyleSheet.absoluteFill}
    />
  );
}
