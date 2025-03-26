import { 
  type User, type InsertUser, ApiModel, ModelsByProvider,
  type Subscription, type InsertSubscription,
  type Payment, type InsertPayment,
  type Plan, type SubscriptionTier
} from "@shared/schema";
import bcrypt from 'bcrypt';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  updateUserSubscription(id: number, tier: SubscriptionTier): Promise<User>;
  updateStripeCustomerId(id: number, customerId: string): Promise<User>;
  
  // Subscription methods
  getSubscription(id: number): Promise<Subscription | undefined>;
  getSubscriptionByUserId(userId: number): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: number, subscription: Partial<Subscription>): Promise<Subscription>;
  
  // Payment methods
  getPayment(id: number): Promise<Payment | undefined>;
  getPaymentsByUserId(userId: number): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<Payment>): Promise<Payment>;
  
  // Plan methods
  getPlans(): Plan[];
  getPlanById(id: string): Plan | undefined;
  
  // Model methods
  getModelsByProvider(provider: string): ApiModel[] | undefined;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private subscriptions: Map<number, Subscription>;
  private payments: Map<number, Payment>;
  private plans: Plan[];
  private models: ModelsByProvider;
  currentId: number;
  private subscriptionId: number;
  private paymentId: number;

  constructor() {
    this.users = new Map();
    this.subscriptions = new Map();
    this.payments = new Map();
    this.currentId = 1;
    this.subscriptionId = 1;
    this.paymentId = 1;
    
    // Define models for OpenAI, Gemini, and DeepSeek providers
    this.models = {
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ],
      gemini: [
        { id: 'gemini-pro', name: 'Gemini Pro' },
        { id: 'gemini-ultra', name: 'Gemini Ultra' }
      ],
      deepseek: [
        { id: 'deepseek-coder', name: 'DeepSeek Coder' },
        { id: 'deepseek-chat', name: 'DeepSeek Chat' }
      ]
    };
    
    // Available subscription plans
    this.plans = [
      {
        id: "free",
        name: "Free Tier",
        price: 0,
        currency: "USD",
        features: ["5 requests per day", "Access to basic models", "No credit card required"],
        requestsPerDay: 5,
        modelAccess: ["openai", "gemini", "deepseek"],
      },
      {
        id: "basic",
        name: "Basic Plan",
        price: 9.99,
        currency: "USD",
        features: [
          "100 requests per day",
          "Access to standard models",
          "Priority support",
          "Save favorite prompts"
        ],
        requestsPerDay: 100,
        modelAccess: ["openai", "gemini", "deepseek"],
        stripe_price_id: "price_basic" // This would be replaced with a real Stripe price ID
      },
      {
        id: "premium",
        name: "Premium Plan",
        price: 19.99,
        currency: "USD",
        features: [
          "Unlimited requests",
          "Access to all models including newest ones",
          "Priority support",
          "Save favorite prompts",
          "Advanced analytics"
        ],
        requestsPerDay: 9999,
        modelAccess: ["openai", "gemini", "deepseek"],
        stripe_price_id: "price_premium" // This would be replaced with a real Stripe price ID
      },
      {
        id: "enterprise",
        name: "Enterprise Plan",
        price: 49.99,
        currency: "USD",
        features: [
          "Unlimited requests",
          "Access to all models including newest ones",
          "Premium support with dedicated account manager",
          "Custom model fine-tuning",
          "Team accounts",
          "Advanced analytics"
        ],
        requestsPerDay: 9999,
        modelAccess: ["openai", "gemini", "deepseek"],
        stripe_price_id: "price_enterprise" // This would be replaced with a real Stripe price ID
      }
    ];
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // Hash password
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    // Create user with additional default properties
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      password: hashedPassword,
      created_at: new Date(),
      subscription_tier: (insertUser.subscription_tier as SubscriptionTier) || "free",
      requests_remaining: 5,
      requests_reset: null,
      stripe_customer_id: insertUser.stripe_customer_id || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Hash password if it's being updated
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateUserSubscription(id: number, tier: SubscriptionTier): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    // Update the user's subscription tier
    const updatedUser = { ...user, subscription_tier: tier };
    
    // Reset requests remaining based on the tier
    const plan = this.getPlanById(tier);
    if (plan) {
      updatedUser.requests_remaining = plan.requestsPerDay;
      updatedUser.requests_reset = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async updateStripeCustomerId(id: number, customerId: string): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = { ...user, stripe_customer_id: customerId };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Subscription methods
  async getSubscription(id: number): Promise<Subscription | undefined> {
    return this.subscriptions.get(id);
  }
  
  async getSubscriptionByUserId(userId: number): Promise<Subscription | undefined> {
    return Array.from(this.subscriptions.values()).find(
      (subscription) => subscription.user_id === userId,
    );
  }
  
  async createSubscription(insertSubscription: InsertSubscription): Promise<Subscription> {
    const id = this.subscriptionId++;
    
    // Ensure correct typing for status and payment_method
    const subscription: Subscription = {
      id,
      user_id: insertSubscription.user_id,
      plan_id: insertSubscription.plan_id,
      status: insertSubscription.status as "active" | "canceled" | "past_due" | "trialing",
      current_period_start: insertSubscription.current_period_start,
      current_period_end: insertSubscription.current_period_end,
      cancel_at_period_end: insertSubscription.cancel_at_period_end || false,
      payment_method: insertSubscription.payment_method as "stripe" | "bitcoin",
      stripe_subscription_id: insertSubscription.stripe_subscription_id || null,
      bitcoin_transaction_id: insertSubscription.bitcoin_transaction_id || null
    };
    
    this.subscriptions.set(id, subscription);
    return subscription;
  }
  
  async updateSubscription(id: number, subscriptionData: Partial<Subscription>): Promise<Subscription> {
    const subscription = await this.getSubscription(id);
    if (!subscription) {
      throw new Error(`Subscription with ID ${id} not found`);
    }
    
    const updatedSubscription = { ...subscription, ...subscriptionData };
    this.subscriptions.set(id, updatedSubscription);
    return updatedSubscription;
  }
  
  // Payment methods
  async getPayment(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getPaymentsByUserId(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (payment) => payment.user_id === userId,
    );
  }
  
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    
    // Ensure correct typing for status and payment_method
    const payment: Payment = {
      id,
      user_id: insertPayment.user_id,
      amount: insertPayment.amount,
      currency: insertPayment.currency || "USD",
      status: insertPayment.status as "pending" | "completed" | "failed",
      payment_method: insertPayment.payment_method as "stripe" | "bitcoin",
      payment_intent_id: insertPayment.payment_intent_id || null,
      bitcoin_address: insertPayment.bitcoin_address || null,
      created_at: new Date()
    };
    
    this.payments.set(id, payment);
    return payment;
  }
  
  async updatePayment(id: number, paymentData: Partial<Payment>): Promise<Payment> {
    const payment = await this.getPayment(id);
    if (!payment) {
      throw new Error(`Payment with ID ${id} not found`);
    }
    
    const updatedPayment = { ...payment, ...paymentData };
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Plan methods
  getPlans(): Plan[] {
    return this.plans;
  }
  
  getPlanById(id: string): Plan | undefined {
    return this.plans.find(plan => plan.id === id);
  }

  getModelsByProvider(provider: string): ApiModel[] | undefined {
    return this.models[provider];
  }
}

export const storage = new MemStorage();
