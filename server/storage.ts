import { users, type User, type InsertUser, ApiModel, ModelsByProvider } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getModelsByProvider(provider: string): ApiModel[] | undefined;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private models: ModelsByProvider;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;

    // Define models for OpenAI and Gemini providers only
    this.models = {
      openai: [
        { id: 'gpt-4o', name: 'GPT-4o' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      ],
      gemini: [
        { id: 'gemini-pro', name: 'Gemini Pro' },
        { id: 'gemini-ultra', name: 'Gemini Ultra' }
      ]
    };
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  getModelsByProvider(provider: string): ApiModel[] | undefined {
    return this.models[provider];
  }
}

export const storage = new MemStorage();
