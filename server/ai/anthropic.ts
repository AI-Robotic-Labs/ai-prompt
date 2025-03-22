import { Response } from "@shared/schema";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

interface AnthropicRequest {
  model: string;
  messages: AnthropicMessage[];
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  model: string;
  content: {
    type: string;
    text: string;
  }[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  stop_reason: string;
}

export async function generateAnthropicResponse(model: string, prompt: string): Promise<Response> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("Anthropic API key is not configured");
  }

  const startTime = Date.now();

  try {
    // Map old model names to new ones if necessary
    let actualModel = model;
    if (model === "claude-3-opus-20240229") {
      // Use the latest models if available
      actualModel = "claude-3-opus-20240229";
    } else if (model === "claude-3-sonnet-20240229") {
      actualModel = "claude-3-sonnet-20240229";
    } else if (model === "claude-3-haiku-20240307") {
      actualModel = "claude-3-haiku-20240307";
    }

    const requestBody: AnthropicRequest = {
      model: actualModel,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    };

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Anthropic API error (${response.status}): ${errorData}`);
    }

    const data: AnthropicResponse = await response.json();
    const content = data.content[0]?.text || "";
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
    const duration = Date.now() - startTime;

    return {
      response: content,
      tokens: tokens,
      provider: "anthropic",
      model,
      duration,
    };
  } catch (error) {
    console.error("Error calling Anthropic:", error);
    throw new Error(error instanceof Error ? error.message : "Failed to generate Anthropic response");
  }
}
