import { users, type User, type InsertUser, articles, type Article, type InsertArticle, type UpdateArticle } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  
  // Article operations
  createArticle(userId: number, article: InsertArticle): Promise<Article>;
  getArticle(id: number): Promise<Article | undefined>;
  getArticlesByUserId(userId: number): Promise<Article[]>;
  getAllArticles(): Promise<Article[]>;
  updateArticle(id: number, article: UpdateArticle): Promise<Article | undefined>;
  getArticleCountByStatus(userId?: number): Promise<{ [key: string]: number }>;
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private articles: Map<number, Article>;
  private userCurrentId: number;
  private articleCurrentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.articles = new Map();
    this.userCurrentId = 1;
    this.articleCurrentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Create an admin user by default
    this.createUser({
      username: "admin",
      email: "admin@thechronicle.com",
      password: "admin123" // This will be hashed in auth.ts
    }).then(user => {
      // Set admin flag for the admin user
      const adminUser = { ...user, isAdmin: true };
      this.users.set(user.id, adminUser);
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id, isAdmin: false };
    this.users.set(id, user);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Article operations
  async createArticle(userId: number, insertArticle: InsertArticle): Promise<Article> {
    const id = this.articleCurrentId++;
    const now = new Date();
    const article: Article = {
      ...insertArticle,
      id,
      userId,
      createdAt: now,
      updatedAt: now,
    };
    this.articles.set(id, article);
    return article;
  }

  async getArticle(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }

  async getArticlesByUserId(userId: number): Promise<Article[]> {
    return Array.from(this.articles.values()).filter(
      (article) => article.userId === userId,
    );
  }

  async getAllArticles(): Promise<Article[]> {
    return Array.from(this.articles.values());
  }

  async updateArticle(id: number, updateData: UpdateArticle): Promise<Article | undefined> {
    const article = this.articles.get(id);
    if (!article) {
      return undefined;
    }

    const updatedArticle: Article = {
      ...article,
      ...updateData,
      updatedAt: new Date(),
    };

    this.articles.set(id, updatedArticle);
    return updatedArticle;
  }

  async getArticleCountByStatus(userId?: number): Promise<{ [key: string]: number }> {
    const articles = userId 
      ? await this.getArticlesByUserId(userId)
      : await this.getAllArticles();
    
    const counts: { [key: string]: number } = {
      total: articles.length,
      draft: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
    };

    articles.forEach(article => {
      if (article.status === 'draft') counts.draft++;
      else if (article.status === 'underReview') counts.underReview++;
      else if (article.status === 'approved') counts.approved++;
      else if (article.status === 'rejected') counts.rejected++;
    });

    return counts;
  }
}

export const storage = new MemStorage();
