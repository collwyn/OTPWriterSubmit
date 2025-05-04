import { users, type User, type InsertUser, articles, type Article, type InsertArticle, type UpdateArticle } from "@shared/schema";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, asc, desc, sql, and } from "drizzle-orm";

const PostgresSessionStore = connectPgSimple(session);

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

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username.toLowerCase()));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        username: insertUser.username.toLowerCase(),
        email: insertUser.email.toLowerCase()
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  // Article operations
  async createArticle(userId: number, insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db
      .insert(articles)
      .values({
        ...insertArticle,
        userId,
      })
      .returning();
    return article;
  }

  async getArticle(id: number): Promise<Article | undefined> {
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    return article;
  }

  async getArticlesByUserId(userId: number): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(desc(articles.createdAt));
  }

  async getAllArticles(): Promise<Article[]> {
    return await db
      .select()
      .from(articles)
      .orderBy(desc(articles.createdAt));
  }

  async updateArticle(id: number, updateData: UpdateArticle): Promise<Article | undefined> {
    const [article] = await db
      .update(articles)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(eq(articles.id, id))
      .returning();
    return article;
  }

  async getArticleCountByStatus(userId?: number): Promise<{ [key: string]: number }> {
    const counts: { [key: string]: number } = {
      total: 0,
      draft: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
    };
    
    // Base query
    let baseQuery = db.select().from(articles);
    
    // Add user filter if provided
    if (userId) {
      baseQuery = baseQuery.where(eq(articles.userId, userId));
    }
    
    // Get all articles
    const allArticles = await baseQuery;
    
    // Count by status
    counts.total = allArticles.length;
    
    for (const article of allArticles) {
      if (article.status === 'draft') counts.draft++;
      else if (article.status === 'underReview') counts.underReview++;
      else if (article.status === 'approved') counts.approved++;
      else if (article.status === 'rejected') counts.rejected++;
    }
    
    return counts;
  }
}

export const storage = new DatabaseStorage();
