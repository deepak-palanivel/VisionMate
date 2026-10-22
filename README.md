# VisionMate

VisionMate is an assistive real-time vision guide designed for blind and visually impaired individuals. Built with React Native and Expo, the application pairs on-device machine learning with audio feedback to detect nearby objects and announce their spatial positions in real time.

## Key Features

- **On-Device Detection**: High-speed, offline object detection using TensorFlow Lite (`react-native-fast-tflite`).
- **Flexible Model Architecture**: Bundled support for YOLO11n, EfficientDet-Lite2, and SSD MobileNet v1.
- **Spatial Audio Guidance**: Real-time spoken narration via `expo-speech` indicating object location (e.g., "laptop ahead", "bottle on your left").
- **Cloud AI Description**: Integrated Google Gemini Vision (`gemini-3-flash-preview`) for on-demand natural language scene narration.
- **Accessibility-Focused UI**: High-contrast controls, large touch targets, and speech throttling to prevent sensory overload.

## Architecture & Bundled Models

The detector dynamically selects between three pre-configured TensorFlow Lite models:

| Model | Input Resolution | Input Type | Output Parser |
| :--- | :--- | :--- | :--- |
| **YOLO11n** | 320x320 | float32 | YOLO parser |
| **EfficientDet-Lite2** | 448x448 | uint8 | Box / Class / Score parser |
| **SSD MobileNet v1** | 300x300 | uint8 | Box / Class / Score parser |

Labels are mapped through `models/labels.json`.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Android Studio / Android SDK (for native Android builds)
- Custom Expo development client (due to native camera and TFLite modules, Expo Go is not supported)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/deepak-palanivel/VisionMate.git
   cd VisionMate
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run on Android:
   ```bash
   npm run android
   ```

4. Run on iOS:
   ```bash
   npm run ios
   ```

## License

This project is licensed under the MIT License.
