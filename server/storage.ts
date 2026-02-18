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
  deleteArticle(id: number): Promise<void>;
  getArticleCountByStatus(userId?: number): Promise<{ [key: string]: number }>;
  
  // Session store
  sessionStore: any;
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
    // Get the article from the database
    const [article] = await db
      .select()
      .from(articles)
      .where(eq(articles.id, id));
    
    // If no article found, return undefined
    if (!article) {
      return undefined;
    }
    
    // Explicitly create a new object with all fields mapped properly
    // This ensures content field is handled correctly
    const processedArticle: Article = {
      id: article.id,
      userId: article.userId,
      title: article.title,
      summary: article.summary,
      // Explicitly convert content to string to handle any potential serialization issues
      content: article.content ? String(article.content) : "",
      category: article.category,
      keywords: article.keywords,
      targetAudience: article.targetAudience,
      featuredImage: article.featuredImage,
      images: article.images,
      imageCaptions: article.imageCaptions,
      video: article.video,
      dropboxLink: article.dropboxLink,
      status: article.status,
      wordCount: article.wordCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    };
    
    console.log("Retrieved article from database:", {
      id: processedArticle.id,
      title: processedArticle.title,
      contentExists: !!processedArticle.content,
      contentLength: processedArticle.content?.length || 0
    });
    
    return processedArticle;
  }

  async getArticlesByUserId(userId: number): Promise<Article[]> {
    // Get articles from database
    const dbArticles = await db
      .select()
      .from(articles)
      .where(eq(articles.userId, userId))
      .orderBy(desc(articles.createdAt));
    
    // Process each article to ensure proper serialization of content field
    return dbArticles.map(article => ({
      id: article.id,
      userId: article.userId,
      title: article.title,
      summary: article.summary,
      content: article.content ? String(article.content) : "",
      category: article.category,
      keywords: article.keywords,
      targetAudience: article.targetAudience,
      featuredImage: article.featuredImage,
      images: article.images,
      imageCaptions: article.imageCaptions,
      video: article.video,
      dropboxLink: article.dropboxLink,
      status: article.status,
      wordCount: article.wordCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    }));
  }

  async getAllArticles(): Promise<Article[]> {
    // Get all articles from database
    const dbArticles = await db
      .select()
      .from(articles)
      .orderBy(desc(articles.createdAt));
    
    // Process each article to ensure proper serialization of content field
    return dbArticles.map(article => ({
      id: article.id,
      userId: article.userId,
      title: article.title,
      summary: article.summary,
      content: article.content ? String(article.content) : "",
      category: article.category,
      keywords: article.keywords,
      targetAudience: article.targetAudience,
      featuredImage: article.featuredImage,
      images: article.images,
      imageCaptions: article.imageCaptions,
      video: article.video,
      dropboxLink: article.dropboxLink,
      status: article.status,
      wordCount: article.wordCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    }));
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
    
    if (!article) {
      return undefined;
    }
    
    // Process article to ensure content field is properly serialized
    return {
      id: article.id,
      userId: article.userId,
      title: article.title,
      summary: article.summary,
      content: article.content ? String(article.content) : "",
      category: article.category,
      keywords: article.keywords,
      targetAudience: article.targetAudience,
      featuredImage: article.featuredImage,
      images: article.images,
      video: article.video,
      dropboxLink: article.dropboxLink,
      status: article.status,
      wordCount: article.wordCount,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt
    };
  }

  async deleteArticle(id: number): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  async getArticleCountByStatus(userId?: number): Promise<{ [key: string]: number }> {
    const counts: { [key: string]: number } = {
      total: 0,
      draft: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
    };
    
    // Get all articles with optional user filter
    let allArticles: Article[];
    if (userId) {
      allArticles = await db.select().from(articles).where(eq(articles.userId, userId));
    } else {
      allArticles = await db.select().from(articles);
    }
    
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
