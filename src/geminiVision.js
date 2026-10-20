import * as FileSystem from 'expo-file-system';

export const GEMINI_MODEL_NAME = 'gemini-3-flash-preview';
export const GEMINI_SCAN_INTERVAL_MS = 5500;

const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL_NAME}:generateContent`;

const GEMINI_PROMPT = [
  'You are Vision Mate, an assistive camera guide for a blind user.',
  'Identify the main nearby object or product in this image.',
  'Give one short spoken sentence, under 14 words.',
  'If useful, mention position or immediate caution.',
  'Do not say "the image shows".',
].join(' ');

function getResponseText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part) => part?.text ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function analyzeGeminiSnapshot(photoPath, apiKey) {
  const cleanApiKey = apiKey?.trim();
  if (!cleanApiKey) {
    throw new Error('Add Gemini API key in the Voice screen.');
  }

  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
  const imageBase64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const response = await fetch(GEMINI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanApiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: 'image/jpeg',
                data: imageBase64,
              },
            },
            { text: GEMINI_PROMPT },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 40,
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message ?? 'Gemini request failed.';
    throw new Error(message);
  }

  const text = getResponseText(payload);
  if (!text) {
    throw new Error('Gemini returned no description.');
  }

  return text.replace(/[.。]+$/, '');
}

export async function deleteSnapshotFile(photoPath) {
  if (!photoPath) {
    return;
  }

  const uri = photoPath.startsWith('file://') ? photoPath : `file://${photoPath}`;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
