import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Prompt schemas
export const promptSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
});

export type Prompt = z.infer<typeof promptSchema>;

// Response schema
export const responseSchema = z.object({
  response: z.string(),
  tokens: z.number().optional(),
  provider: z.string(),
  model: z.string(),
  duration: z.number().optional(),
});

export type Response = z.infer<typeof responseSchema>;

// API Providers and Models
export const providers = ["openai", "gemini"] as const;
export type Provider = (typeof providers)[number];

export interface ApiModel {
  id: string;
  name: string;
}

export interface ModelsByProvider {
  [key: string]: ApiModel[];
}
