import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { promptSchema, responseSchema, insertUserSchema, subscriptionTiers } from "@shared/schema";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { generateOpenAIResponse } from "./ai/openai";
import { generateGeminiResponse } from "./ai/gemini";
import { generateDeepSeekResponse } from "./ai/deepseek";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Stripe from "stripe";

// Create custom interface to add user property to Express Request
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        email: string;
        username: string;
      };
    }
  }
}

// Constants
const JWT_SECRET = process.env.JWT_SECRET || "your-default-jwt-secret-do-not-use-in-production";
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";

// Initialize Stripe with the latest available API version
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16" as any, // Type assertion to bypass the strict version checking
});

// Middleware to verify JWT token
function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }
    
    // @ts-ignore
    req.user = user;
    next();
  });
}

// Middleware to check subscription status and rate limits
async function checkSubscription(req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
  const userId = req.user?.id;
  
  if (!userId) {
    return res.status(401).json({ message: "User not authenticated" });
  }
  
  try {
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if user has requests remaining
    if (user.requests_remaining && user.requests_remaining <= 0) {
      // Check if it's time to reset the counter
      if (user.requests_reset && new Date() > user.requests_reset) {
        // Reset the counter based on subscription tier
        const plan = storage.getPlanById(user.subscription_tier);
        if (plan) {
          await storage.updateUser(userId, { 
            requests_remaining: plan.requestsPerDay,
            requests_reset: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
          });
        }
      } else {
        return res.status(429).json({ 
          message: "Request limit reached for your subscription tier",
          subscription_tier: user.subscription_tier,
          next_reset: user.requests_reset
        });
      }
    }
    
    // Decrement request counter
    if (user.requests_remaining) {
      await storage.updateUser(userId, { 
        requests_remaining: user.requests_remaining - 1 
      });
    }
    
    next();
  } catch (error) {
    console.error("Error checking subscription:", error);
    return res.status(500).json({ message: "Failed to verify subscription status" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check route
  app.get("/api/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "ok" });
  });

  // User Registration
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      // Create user
      const user = await storage.createUser(userData);
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      
      res.status(201).json({
        message: "User registered successfully",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      
      console.error('Error registering user:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to register user",
      });
    }
  });
  
  // User Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Compare passwords
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { id: user.id, email: user.email, username: user.username }, 
        JWT_SECRET, 
        { expiresIn: '7d' }
      );
      
      // Return user data without password
      const { password: _, ...userWithoutPassword } = user;
      
      res.status(200).json({
        message: "Login successful",
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error('Error logging in:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to log in",
      });
    }
  });
  
  // Get user profile
  app.get("/api/user/profile", authenticateToken, async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const userId = req.user?.id;
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user data without password
      const { password, ...userWithoutPassword } = user;
      
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error('Error getting user profile:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get user profile",
      });
    }
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

  // Send prompt to AI API (protected by authentication and subscription check)
  app.post("/api/prompt", authenticateToken, checkSubscription, async (req: Request, res: Response) => {
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
        case "deepseek":
          response = await generateDeepSeekResponse(model, prompt);
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
  
  // Get subscription plans
  app.get("/api/plans", async (_req: Request, res: Response) => {
    try {
      const plans = storage.getPlans();
      res.status(200).json(plans);
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get subscription plans",
      });
    }
  });
  
  // Get current user's subscription
  app.get("/api/user/subscription", authenticateToken, async (req: Request, res: Response) => {
    try {
      // @ts-ignore
      const userId = req.user?.id;
      
      const subscription = await storage.getSubscriptionByUserId(userId);
      if (!subscription) {
        return res.status(404).json({ 
          message: "No active subscription found",
          subscription_tier: "free"
        });
      }
      
      res.status(200).json(subscription);
    } catch (error) {
      console.error('Error getting user subscription:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to get subscription",
      });
    }
  });
  
  // Create Stripe Payment Intent
  app.post("/api/create-payment-intent", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { amount, currency = "usd" } = req.body;
      
      if (!amount) {
        return res.status(400).json({ message: "Amount is required" });
      }
      
      // @ts-ignore
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create or retrieve Stripe customer
      let customerId = user.stripe_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }
      
      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency,
        customer: customerId,
        automatic_payment_methods: { enabled: true },
      });
      
      // Create payment record
      await storage.createPayment({
        user_id: userId,
        amount: amount.toString(),
        currency,
        status: "pending",
        payment_method: "stripe",
        payment_intent_id: paymentIntent.id,
      });
      
      res.status(200).json({
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create payment intent",
      });
    }
  });
  
  // Create or get Stripe subscription
  app.post("/api/create-subscription", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { planId } = req.body;
      
      if (!planId) {
        return res.status(400).json({ message: "Plan ID is required" });
      }
      
      // @ts-ignore
      const userId = req.user?.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get the plan
      const plan = storage.getPlanById(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }
      
      // Check if the plan is free
      if (planId === "free") {
        // Update user subscription tier
        await storage.updateUserSubscription(userId, "free");
        
        return res.status(200).json({
          message: "Subscription updated to free tier",
          subscription_tier: "free"
        });
      }
      
      // For paid plans, we need Stripe
      if (!plan.stripe_price_id || plan.stripe_price_id.startsWith('price_')) {
        return res.status(400).json({ 
          message: "This plan is currently in test mode and not available for subscription. The application is using placeholder Stripe price IDs instead of real ones.", 
          error: "DEMO_MODE" 
        });
      }
      
      // Create or retrieve Stripe customer
      let customerId = user.stripe_customer_id;
      
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.username,
        });
        
        customerId = customer.id;
        await storage.updateStripeCustomerId(userId, customerId);
      }
      
      // Check for existing subscription
      const existingSubscription = await storage.getSubscriptionByUserId(userId);
      
      if (existingSubscription && existingSubscription.stripe_subscription_id) {
        // Retrieve the subscription from Stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(
          existingSubscription.stripe_subscription_id
        );
        
        // Update the subscription
        const updatedSubscription = await stripe.subscriptions.update(
          existingSubscription.stripe_subscription_id,
          {
            items: [{
              id: stripeSubscription.items.data[0].id,
              price: plan.stripe_price_id,
            }],
          }
        );
        
        // Update subscription in database
        await storage.updateSubscription(existingSubscription.id, {
          plan_id: planId,
          current_period_start: new Date(updatedSubscription.current_period_start * 1000),
          current_period_end: new Date(updatedSubscription.current_period_end * 1000),
        });
        
        // Update user subscription tier
        await storage.updateUserSubscription(userId, planId as any);
        
        return res.status(200).json({
          message: "Subscription updated",
          subscription_id: updatedSubscription.id,
        });
      }
      
      // Create a new subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: plan.stripe_price_id }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });
      
      // Create subscription record in database
      await storage.createSubscription({
        user_id: userId,
        plan_id: planId,
        status: subscription.status as any,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        payment_method: "stripe",
        stripe_subscription_id: subscription.id,
      });
      
      // Update user subscription tier
      await storage.updateUserSubscription(userId, planId as any);
      
      // @ts-ignore
      const clientSecret = subscription.latest_invoice.payment_intent.client_secret;
      
      res.status(200).json({
        message: "Subscription created",
        subscription_id: subscription.id,
        client_secret: clientSecret,
      });
    } catch (error) {
      console.error('Error creating subscription:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create subscription",
      });
    }
  });
  
  // Get Bitcoin payment address (demonstration purposes)
  app.post("/api/bitcoin-payment", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { amount, planId } = req.body;
      
      if (!amount || !planId) {
        return res.status(400).json({ message: "Amount and plan ID are required" });
      }
      
      // @ts-ignore
      const userId = req.user?.id;
      
      // In a real application, this would integrate with Coinbase Commerce
      // or another Bitcoin payment processor to create a new charge
      // For this demo, we'll just create a fake Bitcoin address
      const bitcoinAddress = `bitcoin:demo-${Date.now()}-${userId}`;
      
      // Create payment record
      const payment = await storage.createPayment({
        user_id: userId,
        amount: amount.toString(),
        currency: "BTC",
        status: "pending",
        payment_method: "bitcoin",
        bitcoin_address: bitcoinAddress,
      });
      
      res.status(200).json({
        message: "Bitcoin payment address created",
        bitcoin_address: bitcoinAddress,
        payment_id: payment.id,
        amount,
      });
    } catch (error) {
      console.error('Error creating Bitcoin payment:', error);
      return res.status(500).json({
        message: error instanceof Error ? error.message : "Failed to create Bitcoin payment",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
