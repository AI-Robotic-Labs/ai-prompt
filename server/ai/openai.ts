import { Response } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

interface OpenAIResponseFormat {
  type: "json_object" | "text";
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAICompletionRequest {
  model: string;
  messages: OpenAIMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: OpenAIResponseFormat;
}

interface OpenAICompletionResponse {
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

export async function generateOpenAIResponse(model: string, prompt: string): Promise<Response> {
  if (!OPENAI_API_KEY) {
    throw new Error("OpenAI API key is not configured");
  }

  const startTime = Date.now();

  try {
    const requestBody: OpenAICompletionRequest = {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 1000,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorData}`);
    }

    const data: OpenAICompletionResponse = await response.json();
    const content = data.choices[0]?.message.content || "";
    const tokens = data.usage?.total_tokens || 0;
    const duration = Date.now() - startTime;

    return {
      response: content,
      tokens: tokens,
      provider: "openai",
      model,
      duration,
    };
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate OpenAI response");
  }
}
