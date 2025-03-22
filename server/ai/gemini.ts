import { Response } from "@shared/schema";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";

interface GeminiTextPart {
  text: string;
}

interface GeminiContent {
  parts: GeminiTextPart[];
  role: string;
}

interface GeminiGenerationConfig {
  temperature: number;
  maxOutputTokens: number;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig: GeminiGenerationConfig;
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
      role: string;
    };
    finishReason: string;
  }[];
  promptFeedback: {
    safetyRatings: any[];
  };
  usage: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export async function generateGeminiResponse(model: string, prompt: string): Promise<Response> {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not configured");
  }

  const startTime = Date.now();

  try {
    // Map model name if necessary
    let actualModel = model === "gemini-ultra" ? "gemini-1.5-pro" : "gemini-pro";

    const requestBody: GeminiRequest = {
      contents: [
        {
          parts: [{ text: prompt }],
          role: "user"
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${actualModel}:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errorData}`);
    }

    const data: GeminiResponse = await response.json();
    const content = data.candidates[0]?.content.parts[0]?.text || "";
    const tokens = data.usage?.totalTokenCount || 0;
    const duration = Date.now() - startTime;

    return {
      response: content,
      tokens: tokens,
      provider: "gemini",
      model,
      duration,
    };
  } catch (error) {
    console.error("Error calling Gemini:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate Gemini response");
  }
}
