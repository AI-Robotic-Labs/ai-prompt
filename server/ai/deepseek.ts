import { Response } from "@shared/schema";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface DeepSeekCompletionRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface DeepSeekCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function generateDeepSeekResponse(model: string, prompt: string): Promise<Response> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek API key is not configured");
  }

  const startTime = Date.now();

  try {
    // Map model names to actual DeepSeek models
    let actualModel = "deepseek-chat";
    if (model === "deepseek-coder") {
      actualModel = "deepseek-coder";
    } else if (model === "deepseek-r1") {
      actualModel = "deepseek-r1-instruct";
    }

    const requestBody: DeepSeekCompletionRequest = {
      model: actualModel,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    };

    const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`DeepSeek API error (${response.status}): ${errorData}`);
    }

    const data: DeepSeekCompletionResponse = await response.json();
    const content = data.choices[0]?.message.content || "";
    const tokens = data.usage?.total_tokens || 0;
    const duration = Date.now() - startTime;

    return {
      response: content,
      tokens: tokens,
      provider: "deepseek",
      model,
      duration,
    };
  } catch (error) {
    console.error("Error calling DeepSeek:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate DeepSeek response");
  }
}