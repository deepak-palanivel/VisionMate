import { Dimensions } from 'react-native';

const labels = require('../models/labels.json');
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const YOLO_NUM_CLASSES = 80;
const YOLO_CHANNELS = YOLO_NUM_CLASSES + 4;
export const DETECTION_FPS = 1;
const DEFAULT_CONFIDENCE_THRESHOLD = 0.55;
const IOU_THRESHOLD = 0.6;
const MAX_DETECTIONS = 5;
export const ANNOUNCEMENT_COOLDOWN_MS = 2500;
export const STABLE_HISTORY_SIZE = 3;
export const STABLE_MIN_MATCHES = 2;

function getObjectPosition(box) {
  const centerX = box.x + box.width / 2;

  if (centerX < screenWidth * 0.33) {
    return 'on your left';
  }

  if (centerX > screenWidth * 0.66) {
    return 'on your right';
  }

  return 'ahead';
}

export function formatDetection(detection) {
  if (detection.source === 'gemini') {
    return detection.label;
  }

  const position = getObjectPosition(detection.box);
  return `${detection.label} ${position}`;
}

function getCocoLabel(classIndex) {
  'worklet';

  return labels[classIndex.toString()] ?? `object ${classIndex}`;
}

function clamp(value, min, max) {
  'worklet';

  return Math.max(min, Math.min(max, value));
}

function calculateIou(firstBox, secondBox) {
  'worklet';

  const left = Math.max(firstBox.x, secondBox.x);
  const top = Math.max(firstBox.y, secondBox.y);
  const right = Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width);
  const bottom = Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height);
  const intersectionWidth = Math.max(0, right - left);
  const intersectionHeight = Math.max(0, bottom - top);
  const intersectionArea = intersectionWidth * intersectionHeight;
  const firstArea = firstBox.width * firstBox.height;
  const secondArea = secondBox.width * secondBox.height;
  const unionArea = firstArea + secondArea - intersectionArea;

  if (unionArea <= 0) {
    return 0;
  }

  return intersectionArea / unionArea;
}

function getYoloValue(output, layout, predictionCount, predictionIndex, channelIndex) {
  'worklet';

  if (layout === 'channel-last') {
    return output[predictionIndex * YOLO_CHANNELS + channelIndex];
  }

  return output[channelIndex * predictionCount + predictionIndex];
}

function collectYoloCandidates(output, layout, predictionCount, modelInputSize, confidenceThreshold) {
  'worklet';

  const candidates = [];

  for (let predictionIndex = 0; predictionIndex < predictionCount; predictionIndex += 1) {
    let bestClassIndex = -1;
    let bestScore = 0;

    for (let classIndex = 0; classIndex < YOLO_NUM_CLASSES; classIndex += 1) {
      const score = getYoloValue(output, layout, predictionCount, predictionIndex, classIndex + 4);

      if (score > bestScore) {
        bestScore = score;
        bestClassIndex = classIndex;
      }
    }

    if (bestScore < confidenceThreshold || bestClassIndex < 0) {
      continue;
    }

    let centerX = getYoloValue(output, layout, predictionCount, predictionIndex, 0);
    let centerY = getYoloValue(output, layout, predictionCount, predictionIndex, 1);
    let boxWidth = getYoloValue(output, layout, predictionCount, predictionIndex, 2);
    let boxHeight = getYoloValue(output, layout, predictionCount, predictionIndex, 3);

    const coordinateScale = Math.max(centerX, centerY, boxWidth, boxHeight) > 2 ? modelInputSize : 1;
    centerX /= coordinateScale;
    centerY /= coordinateScale;
    boxWidth /= coordinateScale;
    boxHeight /= coordinateScale;

    const x = clamp(centerX - boxWidth / 2, 0, 1);
    const y = clamp(centerY - boxHeight / 2, 0, 1);
    const width = clamp(boxWidth, 0, 1 - x);
    const height = clamp(boxHeight, 0, 1 - y);

    if (width <= 0 || height <= 0) {
      continue;
    }

    const label = getCocoLabel(bestClassIndex);
    const normalizedBox = { x, y, width, height };

    candidates.push({
      id: `${label}-${predictionIndex}`,
      label,
      rawClassIndex: bestClassIndex,
      confidence: bestScore,
      normalizedBox,
      box: {
        x: x * screenWidth,
        y: y * screenHeight,
        width: width * screenWidth,
        height: height * screenHeight,
      },
    });
  }

  return candidates;
}

function applyNms(candidates) {
  'worklet';

  const kept = [];
  const sortedCandidates = candidates.sort((a, b) => b.confidence - a.confidence);

  for (let i = 0; i < sortedCandidates.length; i += 1) {
    const candidate = sortedCandidates[i];
    let shouldKeep = true;

    for (let keptIndex = 0; keptIndex < kept.length; keptIndex += 1) {
      const keptDetection = kept[keptIndex];

      if (
        candidate.rawClassIndex === keptDetection.rawClassIndex &&
        calculateIou(candidate.normalizedBox, keptDetection.normalizedBox) > IOU_THRESHOLD
      ) {
        shouldKeep = false;
        break;
      }
    }

    if (shouldKeep) {
      kept.push(candidate);
    }

    if (kept.length >= MAX_DETECTIONS) {
      break;
    }
  }

  return kept;
}

function normalizeYoloDetections(outputs, modelInputSize, confidenceThreshold) {
  'worklet';

  if (outputs == null || outputs.length < 1 || outputs[0] == null) {
    return [];
  }

  const output = outputs[0];
  const predictionCount = Math.trunc(output.length / YOLO_CHANNELS);
  const channelFirstCandidates = collectYoloCandidates(
    output,
    'channel-first',
    predictionCount,
    modelInputSize,
    confidenceThreshold
  );

  if (channelFirstCandidates.length > 0) {
    return applyNms(channelFirstCandidates);
  }

  const channelLastCandidates = collectYoloCandidates(
    output,
    'channel-last',
    predictionCount,
    modelInputSize,
    confidenceThreshold
  );
  return applyNms(channelLastCandidates);
}

function normalizeBoxDetections(outputs, outputMap, classOffset, confidenceThreshold) {
  'worklet';

  if (outputs == null || outputs.length < 4) {
    return [];
  }

  const boxes = outputs[outputMap?.boxes ?? 0];
  const classes = outputs[outputMap?.classes ?? 1];
  const scores = outputs[outputMap?.scores ?? 2];
  const rawCount = outputs[outputMap?.count ?? 3]?.[0] ?? 0;
  const count = Math.min(Math.trunc(rawCount), MAX_DETECTIONS);
  const detectedObjects = [];

  for (let i = 0; i < count; i += 1) {
    const score = scores[i];

    if (score < confidenceThreshold) {
      continue;
    }

    const classIndex = Math.trunc(classes[i]) + classOffset;
    const label = getCocoLabel(classIndex);
    const ymin = boxes[i * 4];
    const xmin = boxes[i * 4 + 1];
    const ymax = boxes[i * 4 + 2];
    const xmax = boxes[i * 4 + 3];
    const x = clamp(xmin, 0, 1);
    const y = clamp(ymin, 0, 1);
    const width = clamp(xmax - xmin, 0, 1 - x);
    const height = clamp(ymax - ymin, 0, 1 - y);

    if (width <= 0 || height <= 0) {
      continue;
    }

    detectedObjects.push({
      id: `${label}-${i}`,
      label,
      rawClassIndex: classIndex,
      confidence: score,
      normalizedBox: { x, y, width, height },
      box: {
        x: x * screenWidth,
        y: y * screenHeight,
        width: width * screenWidth,
        height: height * screenHeight,
      },
    });
  }

  return detectedObjects.sort((a, b) => b.confidence - a.confidence);
}

export function normalizeDetections(
  outputs,
  parser,
  modelInputSize,
  outputMap,
  classOffset = 0,
  confidenceThreshold = DEFAULT_CONFIDENCE_THRESHOLD
) {
  'worklet';

  if (parser === 'yolo') {
    return normalizeYoloDetections(outputs, modelInputSize, confidenceThreshold);
  }

  return normalizeBoxDetections(outputs, outputMap, classOffset, confidenceThreshold);
}
