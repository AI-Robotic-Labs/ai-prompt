import { pgTable, text, serial, integer, boolean, jsonb, timestamp, varchar, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// API Providers and Models
export const providers = ["openai", "gemini", "deepseek"] as const;
export type Provider = (typeof providers)[number];

export interface ApiModel {
  id: string;
  name: string;
}

export interface ModelsByProvider {
  [key: string]: ApiModel[];
}

// Subscription tier definition
export const subscriptionTiers = ["free", "basic", "premium", "enterprise"] as const;
export type SubscriptionTier = (typeof subscriptionTiers)[number];

// Plan interface for subscription plans
export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  requestsPerDay: number;
  modelAccess: Provider[];
  stripe_price_id?: string;
}

// Prompt & Response schemas
export const promptSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  prompt: z.string().min(1),
});

export type Prompt = z.infer<typeof promptSchema>;

export const responseSchema = z.object({
  response: z.string(),
  tokens: z.number().optional(),
  provider: z.string(),
  model: z.string(),
  duration: z.number().optional(),
});

export type Response = z.infer<typeof responseSchema>;

// Database Tables
// Enhanced user table with subscription-related fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  created_at: timestamp("created_at").defaultNow(),
  subscription_tier: text("subscription_tier").default("free").$type<SubscriptionTier>(),
  stripe_customer_id: text("stripe_customer_id"),
  requests_remaining: integer("requests_remaining").default(5),
  requests_reset: timestamp("requests_reset"),
});

// Create a Zod schema for user insertion/validation
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  password: z.string().min(8),
  username: z.string().min(3).max(50),
}).omit({ 
  id: true,
  created_at: true,
  requests_reset: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Subscription table for managing user subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  plan_id: text("plan_id").notNull(),
  status: text("status").notNull().$type<"active" | "canceled" | "past_due" | "trialing">(),
  current_period_start: timestamp("current_period_start").notNull(),
  current_period_end: timestamp("current_period_end").notNull(),
  cancel_at_period_end: boolean("cancel_at_period_end").default(false),
  payment_method: text("payment_method").notNull().$type<"stripe" | "bitcoin">(),
  stripe_subscription_id: text("stripe_subscription_id"),
  bitcoin_transaction_id: text("bitcoin_transaction_id"),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// Payment table for tracking payment history
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").default("USD"),
  status: text("status").notNull().$type<"pending" | "completed" | "failed">(),
  payment_method: text("payment_method").notNull().$type<"stripe" | "bitcoin">(),
  payment_intent_id: text("payment_intent_id"),
  bitcoin_address: text("bitcoin_address"),
  created_at: timestamp("created_at").defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  created_at: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;
