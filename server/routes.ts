import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { promptSchema, responseSchema } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateOpenAIResponse } from "./ai/openai";
import { generateGeminiResponse } from "./ai/gemini";

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // Get models for a provider
  app.get("/api/models/:provider", (req: Request, res: Response) => {
    const provider = req.params.provider;
    const models = storage.getModelsByProvider(provider);
    
    if (!models) {
      return res.status(404).json({ message: `Provider ${provider} not found` });
    }
    
    res.status(200).json(models);
  });

  // Send prompt to AI API
  app.post("/api/prompt", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const validatedData = promptSchema.parse(req.body);
      const { provider, model, prompt } = validatedData;

      let response;
      
      switch (provider) {
        case "openai":
          response = await generateOpenAIResponse(model, prompt);
          break;
        case "gemini":
          response = await generateGeminiResponse(model, prompt);
          break;
        default:
          return res.status(400).json({ message: `Unsupported provider: ${provider}` });
      }
      
      // Save to response history if needed
      // storage.saveResponse(response);

      return res.status(200).json(response);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error('Error processing prompt:', error);
      
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to process prompt",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
