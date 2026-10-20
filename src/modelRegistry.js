export const MODEL_PLUGINS = [
  {
    key: 'yolo11n',
    label: 'YOLO11n',
    shortLabel: 'YOLO',
    parser: 'yolo',
    inputSize: 320,
    dataType: 'float32',
    confidenceThreshold: 0.55,
    classOffset: 0,
  },
  {
    key: 'efficientdet',
    label: 'EfficientDet-Lite2',
    shortLabel: 'EffDet',
    parser: 'boxes',
    inputSize: 448,
    dataType: 'uint8',
    outputMap: { boxes: 0, scores: 1, classes: 2, count: 3 },
    confidenceThreshold: 0.55,
    classOffset: 0,
  },
  {
    key: 'ssd',
    label: 'SSD MobileNet',
    shortLabel: 'SSD',
    parser: 'boxes',
    inputSize: 300,
    dataType: 'uint8',
    outputMap: { boxes: 0, classes: 1, scores: 2, count: 3 },
    confidenceThreshold: 0.6,
    classOffset: 0,
  },
  {
    key: 'gemini',
    label: 'Gemini Vision',
    shortLabel: 'Gemini',
    parser: 'gemini',
    confidenceThreshold: 1,
  },
];

export const NAV_ITEMS = [
  { key: 'detect', label: 'Detect' },
  { key: 'models', label: 'Models' },
  { key: 'voice', label: 'Voice' },
];
