import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { formatDetection } from './detection';
import { MODEL_PLUGINS, NAV_ITEMS } from './modelRegistry';

export function VisionMateView({
  activeScreen,
  announcementsEnabled,
  cameraLayer,
  engineStarted,
  detections,
  geminiApiKey,
  geminiStatus,
  hasDevice,
  hasPermission,
  lastAnnouncement,
  loadingProgress,
  loadingText,
  model,
  modelProgressText,
  modelSlots,
  modelStatus,
  repeatLastAnnouncement,
  saveGeminiApiKey,
  selectModel,
  selectedPlugin,
  setActiveScreen,
  setGeminiApiKey,
  speechStatus,
  startEngine,
  switchProgress,
  testVoice,
  toggleAnnouncements,
  clearGeminiApiKey,
}) {
  const topDetection = detections[0];
  const isGeminiSelected = selectedPlugin.parser === 'gemini';

  return (
    <View style={styles.container}>
      {cameraLayer}

      {engineStarted && (!hasPermission || !hasDevice) && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {hasPermission ? 'No back camera found' : 'Camera permission needed'}
          </Text>
          {!hasPermission && (
            <>
              <Text style={styles.emptyCopy}>
                This app uses the camera to recognize nearby objects and speak them aloud.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Allow camera access"
                style={styles.primaryButton}
                onPress={startEngine}
              >
                <Text style={styles.primaryButtonText}>Allow Camera</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      <View pointerEvents="none" style={styles.vignetteTop} />
      <View pointerEvents="none" style={styles.vignetteBottom} />

      <View pointerEvents="none" style={styles.focusGuide}>
        <View style={styles.focusGlass} />
        <View style={styles.focusCornerTopLeft} />
        <View style={styles.focusCornerTopRight} />
        <View style={styles.focusCornerBottomLeft} />
        <View style={styles.focusCornerBottomRight} />
      </View>

      <View pointerEvents="none" style={styles.topBar}>
        <Text style={styles.topChip}>{modelStatus}</Text>
        <Text style={styles.topChip}>{speechStatus}</Text>
      </View>

      {loadingText.length > 0 && activeScreen !== 'models' && (
        <View accessibilityLiveRegion="polite" style={styles.loadingBarPanel}>
          <Text style={styles.loadingBarText}>{loadingText}</Text>
          <View style={styles.loadingBarTrack}>
            <View style={[styles.loadingBarFill, { width: `${loadingProgress}%` }]} />
          </View>
        </View>
      )}

      {activeScreen === 'models' && (
        <View style={styles.modelSheet}>
          <View pointerEvents="none" style={styles.sheetHighlight} />
          <Text style={styles.sheetEyebrow}>Current model</Text>
          <Text style={styles.sheetTitle}>{selectedPlugin.label}</Text>
          <Text style={styles.sheetStatus}>{modelProgressText}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${switchProgress}%` }]} />
          </View>
          <View style={styles.modelPicker}>
            {MODEL_PLUGINS.map((plugin) => {
              const isSelected = plugin.key === selectedPlugin.key;
              const slot = modelSlots[plugin.key];
              const isReady = slot?.state === 'loaded';
              const statusText = isSelected && switchProgress < 100
                ? `${switchProgress}%`
                : isReady
                  ? 'ready'
                  : isSelected
                    ? 'loading'
                    : 'tap to load';

              return (
                <Pressable
                  key={plugin.key}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${plugin.label} model`}
                  accessibilityState={{ selected: isSelected }}
                  style={[styles.modelButton, isSelected && styles.selectedModelButton]}
                  onPress={() => selectModel(plugin.key)}
                >
                  <Text style={[styles.modelButtonText, isSelected && styles.selectedModelButtonText]}>
                    {plugin.shortLabel}
                  </Text>
                  <Text style={[styles.modelButtonStatus, isSelected && styles.selectedModelButtonText]}>
                    {statusText}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      {activeScreen === 'detect' && (
        <View style={styles.statusPanel}>
          <View pointerEvents="none" style={styles.statusHighlight} />
          <Text style={styles.statusEyebrow}>
            {!engineStarted ? 'Ready' : topDetection ? `${Math.round(topDetection.confidence * 100)}% confidence` : 'Listening'}
          </Text>
          <Text accessibilityLiveRegion="polite" style={styles.objectText}>
            {!engineStarted ? 'Start detection' : topDetection ? formatDetection(topDetection) : lastAnnouncement}
          </Text>
          <Text style={styles.statusText}>
            {isGeminiSelected
              ? geminiStatus
              : detections.length > 0
                ? `${detections.length} possible match${detections.length === 1 ? '' : 'es'}`
                : `Model: ${selectedPlugin.label}`}
          </Text>
          {!engineStarted && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start detection"
              style={styles.startButton}
              onPress={startEngine}
            >
              <Text style={styles.startButtonText}>Start</Text>
            </Pressable>
          )}
        </View>
      )}

      {activeScreen === 'voice' && (
        <View style={styles.geminiPanel}>
          <View pointerEvents="none" style={styles.statusHighlight} />
          <Text style={styles.statusEyebrow}>Gemini API</Text>
          <Text style={styles.geminiStatus}>{geminiStatus}</Text>
          <TextInput
            accessibilityLabel="Gemini API key"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Paste Gemini API key"
            placeholderTextColor="rgba(255, 255, 255, 0.48)"
            secureTextEntry
            style={styles.geminiInput}
            value={geminiApiKey}
            onChangeText={setGeminiApiKey}
          />
          <View style={styles.geminiButtonRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save Gemini API key"
              style={[styles.controlButton, styles.geminiActionButton, styles.enabledButton]}
              onPress={saveGeminiApiKey}
            >
              <Text style={styles.controlButtonText}>Save</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear Gemini API key"
              style={[styles.controlButton, styles.geminiActionButton]}
              onPress={clearGeminiApiKey}
            >
              <Text style={styles.controlButtonText}>Clear</Text>
            </Pressable>
          </View>
        </View>
      )}

      {activeScreen === 'voice' && (
        <View style={[styles.statusPanel, styles.voiceStatusPanel]}>
          <View pointerEvents="none" style={styles.statusHighlight} />
          <Text style={styles.statusEyebrow}>Voice guidance</Text>
          <Text style={styles.objectText}>{announcementsEnabled ? 'Voice is on' : 'Voice is off'}</Text>
          <Text style={styles.statusText}>Last: {lastAnnouncement}</Text>
        </View>
      )}

      {activeScreen === 'voice' && (
        <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Test voice guidance"
          style={styles.controlButton}
          onPress={testVoice}
        >
          <Text style={styles.controlButtonText}>Test</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Repeat last spoken object"
          style={styles.controlButton}
          onPress={repeatLastAnnouncement}
        >
          <Text style={styles.controlButtonText}>Repeat</Text>
        </Pressable>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel="Voice guidance"
          accessibilityState={{ checked: announcementsEnabled }}
          style={[styles.controlButton, announcementsEnabled ? styles.enabledButton : styles.disabledButton]}
          onPress={toggleAnnouncements}
        >
          <Text style={styles.controlButtonText}>
            Voice {announcementsEnabled ? 'On' : 'Off'}
          </Text>
        </Pressable>
      </View>
      )}

      <View style={styles.navPill}>
        {NAV_ITEMS.map((item) => {
          const isSelected = item.key === activeScreen;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.label} screen`}
              accessibilityState={{ selected: isSelected }}
              style={[styles.navItem, isSelected && styles.selectedNavItem]}
              onPress={() => setActiveScreen(item.key)}
            >
              <Text style={[styles.navItemText, isSelected && styles.selectedNavItemText]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {engineStarted && model?.state === 'loading' && (
        <View style={styles.loading}>
          <ActivityIndicator color="#ffe16a" />
        </View>
      )}

      {engineStarted && model?.state === 'error' && (
        <View style={styles.errorPanel}>
          <Text style={styles.errorText}>{model.error?.message ?? 'Model failed to load'}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030507',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 28,
    backgroundColor: '#050505',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyCopy: {
    color: '#ddd',
    fontSize: 17,
    lineHeight: 24,
    textAlign: 'center',
  },
  primaryButton: {
    minHeight: 54,
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 221, 91, 0.92)',
    paddingHorizontal: 22,
  },
  primaryButtonText: {
    color: '#111',
    fontSize: 17,
    fontWeight: '800',
  },
  vignetteTop: {
    position: 'absolute',
    zIndex: 1,
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.24)',
  },
  vignetteBottom: {
    position: 'absolute',
    zIndex: 1,
    right: 0,
    bottom: 0,
    left: 0,
    height: 310,
    backgroundColor: 'rgba(0, 0, 0, 0.34)',
  },
  focusGuide: {
    position: 'absolute',
    zIndex: 2,
    top: '20%',
    left: '10%',
    right: '10%',
    bottom: '34%',
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
  },
  focusGlass: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 36,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  focusCornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 58,
    height: 58,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 34,
    borderColor: '#ffe16a',
  },
  focusCornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 58,
    height: 58,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 34,
    borderColor: '#ffe16a',
  },
  focusCornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 58,
    height: 58,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 34,
    borderColor: '#ffe16a',
  },
  focusCornerBottomRight: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 58,
    height: 58,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderBottomRightRadius: 34,
    borderColor: '#ffe16a',
  },
  topBar: {
    position: 'absolute',
    zIndex: 6,
    top: 42,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  topChip: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    backgroundColor: 'rgba(8, 11, 14, 0.48)',
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 18,
    elevation: 6,
  },
  loadingBarPanel: {
    position: 'absolute',
    zIndex: 7,
    top: 94,
    left: 16,
    right: 16,
    overflow: 'hidden',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.26)',
    backgroundColor: 'rgba(5, 9, 12, 0.68)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 22,
    elevation: 8,
  },
  loadingBarText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  loadingBarTrack: {
    height: 7,
    overflow: 'hidden',
    marginTop: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  loadingBarFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#ffe16a',
  },
  modelPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  modelSheet: {
    position: 'absolute',
    zIndex: 7,
    top: 92,
    left: 16,
    right: 16,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(4, 8, 10, 0.82)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
  },
  sheetHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  sheetEyebrow: {
    color: '#ffe16a',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  sheetTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 30,
    fontWeight: '900',
  },
  sheetStatus: {
    marginTop: 4,
    color: '#d7e2dc',
    fontSize: 14,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    overflow: 'hidden',
    marginTop: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 8,
    backgroundColor: '#ffe16a',
  },
  modelButton: {
    flexBasis: '48%',
    flexGrow: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(8, 11, 14, 0.42)',
    paddingVertical: 7,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 5,
  },
  selectedModelButton: {
    borderColor: 'rgba(255, 255, 255, 0.66)',
    backgroundColor: 'rgba(255, 225, 106, 0.92)',
  },
  modelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '900',
  },
  modelButtonStatus: {
    marginTop: 2,
    color: '#d7e2dc',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  selectedModelButtonText: {
    color: '#0b0b0b',
  },
  statusPanel: {
    position: 'absolute',
    zIndex: 7,
    bottom: 122,
    left: 16,
    right: 16,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(4, 8, 10, 0.62)',
    paddingHorizontal: 22,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOpacity: 0.36,
    shadowRadius: 28,
    elevation: 10,
  },
  geminiPanel: {
    position: 'absolute',
    zIndex: 7,
    top: 92,
    left: 16,
    right: 16,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(4, 8, 10, 0.7)',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 28,
    elevation: 10,
  },
  geminiStatus: {
    marginTop: 5,
    color: '#d7e2dc',
    fontSize: 14,
    fontWeight: '800',
  },
  geminiInput: {
    minHeight: 50,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.32)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 14,
  },
  geminiButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  geminiActionButton: {
    minHeight: 48,
  },
  voiceStatusPanel: {
    bottom: 218,
  },
  statusHighlight: {
    position: 'absolute',
    top: 0,
    left: 18,
    right: 18,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.44)',
  },
  statusEyebrow: {
    color: '#ffe16a',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  objectText: {
    color: '#fff',
    marginTop: 6,
    fontSize: 30,
    fontWeight: '900',
  },
  statusText: {
    marginTop: 6,
    color: '#d7e2dc',
    fontSize: 15,
    fontWeight: '700',
  },
  startButton: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.66)',
    backgroundColor: 'rgba(255, 225, 106, 0.94)',
  },
  startButtonText: {
    color: '#0b0b0b',
    fontSize: 17,
    fontWeight: '900',
  },
  controls: {
    position: 'absolute',
    zIndex: 8,
    right: 16,
    bottom: 122,
    left: 16,
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    flex: 1,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
  enabledButton: {
    borderColor: 'rgba(255, 255, 255, 0.66)',
    backgroundColor: 'rgba(255, 225, 106, 0.94)',
  },
  disabledButton: {
    backgroundColor: 'rgba(210, 210, 210, 0.78)',
  },
  controlButtonText: {
    color: '#0b0b0b',
    fontSize: 16,
    fontWeight: '900',
  },
  navPill: {
    position: 'absolute',
    zIndex: 10,
    right: 16,
    bottom: 34,
    left: 16,
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.24)',
    backgroundColor: 'rgba(6, 9, 12, 0.58)',
    padding: 7,
    shadowColor: '#000',
    shadowOpacity: 0.32,
    shadowRadius: 24,
    elevation: 9,
  },
  navItem: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  selectedNavItem: {
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    backgroundColor: 'rgba(255, 225, 106, 0.92)',
  },
  navItemText: {
    color: '#eef5f2',
    fontSize: 15,
    fontWeight: '900',
  },
  selectedNavItemText: {
    color: '#0b0b0b',
  },
  loading: {
    position: 'absolute',
    top: 150,
    alignSelf: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    padding: 12,
  },
  errorPanel: {
    position: 'absolute',
    right: 16,
    bottom: 116,
    left: 16,
    borderRadius: 8,
    backgroundColor: '#b00020',
    padding: 14,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
