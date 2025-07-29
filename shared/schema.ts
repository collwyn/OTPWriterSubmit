import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
});

export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  keywords: text("keywords"),
  targetAudience: text("target_audience"),
  featuredImage: text("featured_image"),
  dropboxLink: text("dropbox_link"),
  status: text("status").default("draft").notNull(),
  wordCount: integer("word_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email("Please enter a valid email address"),
}).pick({
  username: true,
  email: true,
  password: true,
});

export const loginUserSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertArticleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().min(1, "Summary is required").max(500),
  content: z.string().min(1, "Content is required"),
  category: z.enum(["local", "business", "technology", "arts", "sports", "opinion", "lifestyle", "newsletter"]),
  keywords: z.string().optional(),
  targetAudience: z.enum(["general", "youth", "seniors", "professionals"]).default("general"),
  status: z.enum(["draft", "underReview", "approved", "rejected"]).default("draft"),
  featuredImage: z.string().optional(),
  images: z.string().optional(), // JSON string of image filenames array
  dropboxLink: z.string().optional(),
  wordCount: z.number().optional(),
});

export const updateArticleSchema = insertArticleSchema.partial();

export const usersRelations = relations(users, ({ many }) => ({
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one }) => ({
  author: one(users, {
    fields: [articles.userId],
    references: [users.id],
  }),
}));

export type InsertUser = z.infer<typeof insertUserSchema>;
export type LoginUser = z.infer<typeof loginUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type UpdateArticle = z.infer<typeof updateArticleSchema>;
export type Article = typeof articles.$inferSelect;