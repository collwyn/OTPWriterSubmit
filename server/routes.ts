import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { uploadToDropbox, createUserFolder } from "./dropbox";
import { sendSubmissionNotification } from "./email";
import { upload, handleUploadError } from "./multer";
import { insertArticleSchema, updateArticleSchema } from "@shared/schema";
import { validateRequest } from "zod-express-middleware";
import fs from "fs";
import path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Article routes
  app.get("/api/articles", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Admin sees all articles, users see only their own
      const articles = req.user.isAdmin 
        ? await storage.getAllArticles() 
        : await storage.getArticlesByUserId(req.user.id);

      // Get user information for each article (for admin view)
      const articlesWithUserInfo = await Promise.all(articles.map(async (article) => {
        const user = await storage.getUser(article.userId);
        return {
          ...article,
          author: user ? { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          } : null
        };
      }));

      res.json(articlesWithUserInfo);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch articles" });
    }
  });

  app.get("/api/articles/:id", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }
      
      console.log("Article fetched:", {
        id: article.id,
        title: article.title,
        contentLength: article.content ? article.content.length : 0,
        contentStart: article.content ? article.content.substring(0, 30) : "No content"
      });

      // Only allow access if admin or article owner
      if (!req.user.isAdmin && article.userId !== req.user.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Get author information
      const author = await storage.getUser(article.userId);
      const articleWithAuthor = {
        ...article,
        author: author ? { 
          id: author.id, 
          username: author.username, 
          email: author.email 
        } : null
      };

      res.json(articleWithAuthor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post(
    "/api/articles",
    upload.single("featuredImage"),
    handleUploadError,
    validateRequest({ body: insertArticleSchema }),
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Process the uploaded file if exists
        let featuredImage = null;
        if (req.file) {
          // Create Dropbox folder for user if needed
          await createUserFolder(req.user.id);
          
          // Upload to Dropbox if integration is available
          const dropboxLink = await uploadToDropbox(
            req.file.path,
            req.user.id,
            req.file.filename
          );
          
          // Keep local path for now
          featuredImage = req.file.filename;
        }

        // Calculate word count if content exists
        const content = req.body.content || "";
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        // Create article with file info and word count
        const newArticle = await storage.createArticle(req.user.id, {
          ...req.body,
          featuredImage,
          wordCount
        });

        // Send email notification to admin if article is submitted for review
        if (newArticle.status === "underReview") {
          // Get all admin users
          const allUsers = await storage.getAllUsers();
          const adminEmails = allUsers
            .filter((user) => user.isAdmin)
            .map((admin) => admin.email);

          if (adminEmails.length > 0) {
            await sendSubmissionNotification(newArticle, req.user, adminEmails);
          }
        }

        res.status(201).json(newArticle);
      } catch (error) {
        console.error("Error creating article:", error);
        res.status(500).json({ message: "Failed to create article" });
      }
    }
  );

  app.patch(
    "/api/articles/:id",
    upload.single("featuredImage"),
    handleUploadError,
    validateRequest({ body: updateArticleSchema }),
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        const id = parseInt(req.params.id);
        const article = await storage.getArticle(id);

        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }

        // Only allow update if admin or article owner
        if (!req.user.isAdmin && article.userId !== req.user.id) {
          return res.status(403).json({ message: "Forbidden" });
        }

        // Process new featured image if uploaded
        let featuredImage = article.featuredImage;
        if (req.file) {
          // Create user folder in Dropbox if needed
          await createUserFolder(req.user.id);
          
          // Upload to Dropbox if integration is available
          const dropboxLink = await uploadToDropbox(
            req.file.path,
            req.user.id,
            req.file.filename
          );
          
          // Keep local path for now
          featuredImage = req.file.filename;
        }

        // Calculate word count if content changed
        let wordCount = article.wordCount;
        if (req.body.content) {
          wordCount = req.body.content.split(/\s+/).filter(Boolean).length;
        }

        // Update article
        const updatedArticle = await storage.updateArticle(id, {
          ...req.body,
          featuredImage,
          wordCount
        });

        // If status changed to underReview, send email notification
        if (
          req.body.status === "underReview" && 
          article.status !== "underReview"
        ) {
          // Get author info if admin is updating the article
          const author = req.user.id === article.userId 
            ? req.user 
            : await storage.getUser(article.userId);
            
          // Get admin emails
          const allUsers = await storage.getAllUsers();
          const adminEmails = allUsers
            .filter((user) => user.isAdmin)
            .map((admin) => admin.email);

          if (author && adminEmails.length > 0) {
            await sendSubmissionNotification(
              updatedArticle!,
              author,
              adminEmails
            );
          }
        }

        res.json(updatedArticle);
      } catch (error) {
        console.error("Error updating article:", error);
        res.status(500).json({ message: "Failed to update article" });
      }
    }
  );

  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // User stats or admin stats based on role
      const userId = req.user.isAdmin ? undefined : req.user.id;
      const stats = await storage.getArticleCountByStatus(userId);

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Handle image serving
  app.get("/uploads/:filename", (req: Request, res: Response) => {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).json({ message: "Image not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
