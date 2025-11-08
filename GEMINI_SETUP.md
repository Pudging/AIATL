# Gemini Motion Analysis Setup

## Overview
This project integrates Google's Gemini 1.5 Flash model for enhanced motion analysis alongside MoveNet pose detection.

## Features
- **Motion Classification**: Identifies basketball shooting motions, dunks, layups, etc.
- **Semantic Labeling**: Provides natural language descriptions of movements
- **Shot Type Suggestions**: Recommends shot classifications based on motion patterns
- **Anomaly Detection**: Identifies unusual aspects of the motion

## Setup

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variable
Create a `.env.local` file in the project root:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Install Dependencies
```bash
pnpm install
```

## Usage

### Enable/Disable Gemini Analysis
The Gemini integration is controlled by a feature flag in the code. Look for:

```typescript
const USE_GEMINI_ANALYSIS = false; // Set to true to enable
```

### How It Works
1. **MoveNet** extracts pose keypoints from video frames (30-90 frames over 3 seconds)
2. **Keypoints are normalized** and formatted with confidence scores
3. **Gemini analyzes** the sequence and returns structured motion analysis
4. **Results augment** the existing MoveNet-based gesture detection

### API Models
- **Gemini 1.5 Flash**: Fast, cost-effective analysis (default)
- **Gemini 1.5 Pro**: More accurate but slower (can be configured in `lib/gemini.ts`)

## Cost Considerations
- Gemini 1.5 Flash: ~$0.00001 per analysis (very cheap)
- Analyses are triggered only when gestures are detected
- Keyframes are sampled (every 3rd frame) to reduce token usage

## Example Output
```json
{
  "classification": "basketball shot",
  "confidence": 0.92,
  "description": "Right-handed shooting motion with proper elbow alignment and follow-through",
  "suggestedShotType": "normal",
  "anomalies": []
}
```

## Troubleshooting
- **"Gemini API key not found"**: Ensure `.env.local` exists with `GEMINI_API_KEY`
- **Slow responses**: Consider reducing frame sampling rate in `lib/gemini.ts`
- **Parsing errors**: Check console logs for Gemini response format issues

