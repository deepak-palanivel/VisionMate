<<<<<<< HEAD
# Vision Guide

An Expo-based React Native app that uses Vision Camera and TensorFlow Lite for
on-device object detection. The app is designed for blind and low-vision users:
when the phone camera is pointed at nearby objects, it detects the best match and
speaks the object name and position, such as "laptop ahead" or "bottle on your
left".

## Features

- Full-screen camera viewfinder
- On-device TensorFlow Lite inference with `react-native-fast-tflite`
- Real-time frame processing with `react-native-vision-camera`
- Spoken object guidance with `expo-speech`
- High-contrast viewfinder and status text
- Repeat and Voice On/Off controls with accessibility labels
- Model picker for comparing bundled TensorFlow Lite detectors

## Requirements

This project uses native camera and TensorFlow Lite modules, so it must run in a
custom Expo development build or a native build. It will not run inside Expo Go.

## Run

```bash
npm install
npm run android
```

For iOS:

```bash
npm run ios
```

To start Metro for an already installed development build:

```bash
npm start
```

## Models

The app currently bundles three local detector plugins:

```text
models/yolo11n.tflite
models/efficientdet_lite2_detection.tflite
models/ssd_mobilenet_v1.tflite
```

Each model slot defines its input size, input data type, and parser in
`App.js`. This makes it easy to add or replace model plugins without rewriting
the camera UI.

The current slots are:

```text
YOLO11n            320x320 float32, YOLO output parser
EfficientDet-Lite2 448x448 uint8, box/class/score parser
SSD MobileNet      300x300 uint8, box/class/score parser
```

The labels live at:

```text
models/labels.json
```

To use a custom model, add the `.tflite` file to `models`, update
`MODEL_PLUGINS` in `App.js`, and reuse either the `yolo` parser or `boxes`
parser. Add a new parser only when the model has a different output tensor
shape.

## Accessibility Notes

The app announces only stable high-confidence detections and throttles speech so
the user is not overwhelmed while moving the camera. The current implementation
announces the most confident object and whether it is left, right, or ahead.
=======

>>>>>>> c3b3d07d18b50f9babb0f880df8525197fbe919a
