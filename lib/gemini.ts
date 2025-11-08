import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export interface PoseFrame {
  frame: number;
  timestamp: number;
  pose: {
    [keypoint: string]: [number, number, number]; // [x, y, confidence]
  };
}

export interface GeminiMotionAnalysis {
  classification: string;
  confidence: number;
  description: string;
  suggestedShotType?: 'normal' | 'dunk' | 'layup';
  anomalies?: string[];
}

/**
 * Analyze a sequence of pose keyframes using Gemini
 * @param frames Array of pose frames (typically 3 seconds worth)
 * @param useGemini Feature flag to enable/disable Gemini analysis
 * @returns Motion analysis or null if disabled/failed
 */
export async function analyzeMotionWithGemini(
  frames: PoseFrame[],
  useGemini: boolean = false
): Promise<GeminiMotionAnalysis | null> {
  if (!useGemini || !genAI || !process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    // Use Gemini 1.5 Flash for fast, cost-effective analysis
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // Prepare the prompt with pose data
    const prompt = buildMotionAnalysisPrompt(frames);

    // Generate analysis
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the response
    return parseGeminiResponse(text);
  } catch (error) {
    console.error('[Gemini] Error analyzing motion:', error);
    return null;
  }
}

/**
 * Build a structured prompt for Gemini with pose keypoint data
 */
function buildMotionAnalysisPrompt(frames: PoseFrame[]): string {
  // Sample frames to reduce token usage (every 3rd frame)
  const sampledFrames = frames.filter((_, i) => i % 3 === 0);
  
  // Format keypoints for each sampled frame
  const frameDescriptions = sampledFrames.map(frame => {
    const keypoints = Object.entries(frame.pose)
      .filter(([_, coords]) => coords[2] > 0.3) // Only include confident keypoints
      .map(([name, [x, y, conf]]) => `${name}: (${x.toFixed(2)}, ${y.toFixed(2)}, conf: ${conf.toFixed(2)})`)
      .join(', ');
    
    return `Frame ${frame.frame} (${frame.timestamp.toFixed(2)}s): ${keypoints}`;
  }).join('\n');

  return `You are a basketball motion analysis expert. Analyze this sequence of human pose keypoints captured over 3 seconds.

The keypoints represent body positions (x, y coordinates normalized 0-1, with confidence scores).

Pose sequence:
${frameDescriptions}

Based on this motion data, provide a JSON response with:
1. "classification": The type of motion (e.g., "basketball shot", "dunk motion", "layup", "standing", "walking")
2. "confidence": Your confidence in this classification (0-1)
3. "description": A brief natural language description of the movement
4. "suggestedShotType": If it's a basketball shot, classify as "normal", "dunk", or "layup" (or null if not a shot)
5. "anomalies": Array of any unusual aspects of the motion (or empty array)

Respond ONLY with valid JSON, no other text.`;
}

/**
 * Parse Gemini's response into structured data
 */
function parseGeminiResponse(text: string): GeminiMotionAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        classification: parsed.classification || 'unknown',
        confidence: parsed.confidence || 0,
        description: parsed.description || '',
        suggestedShotType: parsed.suggestedShotType || undefined,
        anomalies: parsed.anomalies || []
      };
    }
  } catch (error) {
    console.error('[Gemini] Failed to parse response:', error);
  }

  // Fallback if parsing fails
  return {
    classification: 'unknown',
    confidence: 0,
    description: text.substring(0, 200),
    anomalies: ['Failed to parse Gemini response']
  };
}

/**
 * Helper to convert MoveNet pose to our frame format
 */
export function movenetPoseToFrame(
  pose: any,
  frameNumber: number,
  timestamp: number
): PoseFrame {
  const keypoints: { [key: string]: [number, number, number] } = {};
  
  if (pose?.keypoints) {
    pose.keypoints.forEach((kp: any) => {
      if (kp.name) {
        keypoints[kp.name] = [kp.x || 0, kp.y || 0, kp.score || 0];
      }
    });
  }

  return {
    frame: frameNumber,
    timestamp,
    pose: keypoints
  };
}

