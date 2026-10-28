import type { Express, Request, Response } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { sendSubmissionNotification } from "./email";
import { upload, validateImageFileSize, handleUploadError } from "./multer";
import { downloadArticleAsZip } from "./download";
import { getFile, saveFile } from "./storage-files";
import { Client, StreamRequestError } from "@replit/object-storage";
import { insertArticleSchema, updateArticleSchema } from "@shared/schema";
import { validateRequest } from "zod-express-middleware";
import fs from "fs";
import os from "os";
import path from "path";
import { pipeline } from "stream/promises";

type UploadedArticleFile = { path: string; filename: string };
type UploadedArticleFields = { images?: UploadedArticleFile[]; video?: UploadedArticleFile[] };

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Serve static files from uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  app.get("/media/*", async (req: Request, res: Response) => {
    const key = req.params[0];
    if (!key) {
      return res.status(404).end();
    }

    const extension = path.extname(key).toLowerCase();
    const contentTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".mp4": "video/mp4",
    };
    const contentType = contentTypes[extension] || "application/octet-stream";

    if (extension === ".mp4") {
      res.setHeader("Content-Type", contentType);
      res.setHeader("Accept-Ranges", "bytes");

      const rangeHeader = req.headers.range;
      if (!rangeHeader) {
        const mediaStream = new Client().downloadAsStream(key);
        mediaStream.on("error", (error) => {
          const statusCode = error instanceof StreamRequestError
            ? error.getRequestError().statusCode
            : undefined;
          if (!res.headersSent) {
            res.status(statusCode === 404 ? 404 : 500).end();
          } else {
            res.destroy(error);
          }
        });
        mediaStream.pipe(res);
        return;
      }

      let tempDir: string | undefined;
      try {
        tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "media-range-"));
        const tempFile = path.join(tempDir, "media.mp4");
        await pipeline(new Client().downloadAsStream(key), fs.createWriteStream(tempFile));
        const fileSize = (await fs.promises.stat(tempFile)).size;
        const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);

        if (!rangeMatch || fileSize === 0 || (!rangeMatch[1] && !rangeMatch[2])) {
          res.setHeader("Content-Range", `bytes */${fileSize}`);
          res.setHeader("Content-Length", "0");
          return res.status(416).end();
        }

        let start: number;
        let end: number;
        if (!rangeMatch[1]) {
          const suffixLength = Number(rangeMatch[2]);
          if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) {
            res.setHeader("Content-Range", `bytes */${fileSize}`);
            res.setHeader("Content-Length", "0");
            return res.status(416).end();
          }
          start = Math.max(fileSize - suffixLength, 0);
          end = fileSize - 1;
        } else {
          start = Number(rangeMatch[1]);
          end = rangeMatch[2] ? Number(rangeMatch[2]) : fileSize - 1;
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= fileSize || start > end) {
            res.setHeader("Content-Range", `bytes */${fileSize}`);
            res.setHeader("Content-Length", "0");
            return res.status(416).end();
          }
          end = Math.min(end, fileSize - 1);
        }

        res.status(206);
        res.setHeader("Content-Range", `bytes ${start}-${end}/${fileSize}`);
        res.setHeader("Content-Length", String(end - start + 1));
        await pipeline(fs.createReadStream(tempFile, { start, end }), res);
      } catch (error) {
        const statusCode = error instanceof StreamRequestError
          ? error.getRequestError().statusCode
          : undefined;
        if (!res.headersSent) {
          if (statusCode === 404) return res.status(404).end();
          console.error(`Failed to load media object ${key}:`, error);
          return res.status(500).json({ message: "Failed to load media file" });
        }
        res.destroy(error as Error);
      } finally {
        if (tempDir) {
          await fs.promises.rm(tempDir, { recursive: true, force: true });
        }
      }
      return;
    }

    try {
      const contents = await getFile(key);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", String(contents.length));
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(contents);
    } catch (error) {
      if (typeof error === "object" && error !== null && "statusCode" in error && error.statusCode === 404) {
        return res.status(404).end();
      }
      console.error(`Failed to load media object ${key}:`, error);
      res.status(500).json({ message: "Failed to load media file" });
    }
  });

  // User routes
  app.get("/api/users", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated() || !req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const users = await storage.getAllUsers();
      // Remove passwords from response for security
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/articles", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      console.log(`User ${req.user!.username} (ID: ${req.user!.id}, isAdmin: ${req.user!.isAdmin}) is fetching articles`);

      // Admin sees all articles, users see only their own
      const articles = req.user!.isAdmin 
        ? await storage.getAllArticles() 
        : await storage.getArticlesByUserId(req.user!.id);

      console.log(`Fetched ${articles.length} articles`);
      
      // Get user information for each article (for admin view)
      const articlesWithUserInfo = await Promise.all(articles.map(async (article) => {
        const user = await storage.getUser(article.userId);
        // Explicitly construct a new object to avoid any potential serialization issues
        return {
          id: article.id,
          userId: article.userId,
          title: article.title,
          summary: article.summary,
          // Force content to be a string
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
          updatedAt: article.updatedAt,
          author: user ? { 
            id: user.id, 
            username: user.username, 
            email: user.email 
          } : null
        };
      }));

      res.json(articlesWithUserInfo);
    } catch (error) {
      console.error("Error in GET /api/articles:", error);
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
      
        // Create a completely new object with explicitly defined properties
        // This ensures the content is properly serialized
        const articleWithAuthor = {
          id: article.id,
          userId: article.userId,
          title: article.title,
          summary: article.summary,
          // Force content to be a string and handle trimming
          content: article.content ? String(article.content).trim() : "",
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
          updatedAt: article.updatedAt,
          author: author ? { 
            id: author.id, 
            username: author.username, 
            email: author.email 
          } : null
        };
      
      console.log("Sending single article with content info:", {
        id: articleWithAuthor.id,
        contentIncluded: 'content' in articleWithAuthor,
        contentType: typeof articleWithAuthor.content,
        contentLength: articleWithAuthor.content ? articleWithAuthor.content.length : 0,
        contentFirstChars: articleWithAuthor.content ? articleWithAuthor.content.substring(0, 30) : ""
      });

      res.json(articleWithAuthor);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch article" });
    }
  });

  app.post(
    "/api/articles",
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    validateImageFileSize,
    handleUploadError,
    validateRequest({ body: insertArticleSchema }),
    async (req: Request, res: Response) => {
      try {
        if (!req.isAuthenticated()) {
          return res.status(401).json({ message: "Unauthorized" });
        }

        // Process uploaded files if they exist
        let featuredImage = null;
        let images: string[] = [];
        let video: string | null = null;
        
        const uploadedFiles = (req as Request & { files?: UploadedArticleFields }).files;
        const imageFiles = uploadedFiles?.images || [];
        const videoFiles = uploadedFiles?.video || [];

        if (imageFiles.length > 0 || videoFiles.length > 0) {
          // Process uploaded images
          for (const file of imageFiles) {
            try {
              const key = await saveFile(file.path, `submissions/user_${req.user.id}/${file.filename}`);
              images.push(`/media/${key}`);
            } catch (error) {
              console.error("Failed to save submitted image:", error);
              return res.status(500).json({ message: "A file could not be saved. Please try again." });
            }
          }

          // Process uploaded video
          for (const file of videoFiles) {
            try {
              const key = await saveFile(file.path, `submissions/user_${req.user.id}/${file.filename}`);
              video = `/media/${key}`;
            } catch (error) {
              console.error("Failed to save submitted video:", error);
              return res.status(500).json({ message: "A file could not be saved. Please try again." });
            }
          }
          
          // Set the first image as featured image for backward compatibility
          if (images.length > 0) {
            featuredImage = images[0];
          }
        }

        // Calculate word count if content exists
        const content = req.body.content || "";
        const wordCount = content.split(/\s+/).filter(Boolean).length;

        // Create article with file info and word count
        const newArticle = await storage.createArticle(req.user.id, {
          ...req.body,
          featuredImage,
          images: images.length > 0 ? JSON.stringify(images) : null,
          imageCaptions: req.body.imageCaptions || null,
          video,
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
    upload.fields([
      { name: "images", maxCount: 10 },
      { name: "video", maxCount: 1 },
    ]),
    validateImageFileSize,
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

        // Process new images and video if uploaded
        let featuredImage = article.featuredImage;
        let existingImages: string[] = article.images ? JSON.parse(article.images) : [];
        let newImages: string[] = [];
        let video = article.video;
        
        const uploadedFiles = (req as Request & { files?: UploadedArticleFields }).files;
        const imageFiles = uploadedFiles?.images || [];
        const videoFiles = uploadedFiles?.video || [];

        if (imageFiles.length > 0 || videoFiles.length > 0) {
          // Process uploaded images
          for (const file of imageFiles) {
            try {
              const key = await saveFile(file.path, `submissions/user_${req.user.id}/${file.filename}`);
              newImages.push(`/media/${key}`);
            } catch (error) {
              console.error("Failed to save submitted image:", error);
              return res.status(500).json({ message: "A file could not be saved. Please try again." });
            }
          }

          // Process uploaded video
          for (const file of videoFiles) {
            try {
              const key = await saveFile(file.path, `submissions/user_${req.user.id}/${file.filename}`);
              video = `/media/${key}`;
            } catch (error) {
              console.error("Failed to save submitted video:", error);
              return res.status(500).json({ message: "A file could not be saved. Please try again." });
            }
          }
          
          // Combine existing and new images (limit to 10 total)
          const allImages = [...existingImages, ...newImages].slice(0, 10);
          
          // Update featured image if we have new images
          if (newImages.length > 0) {
            featuredImage = allImages[0];
          }
          
          existingImages = allImages;
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
          images: existingImages.length > 0 ? JSON.stringify(existingImages) : null,
          imageCaptions: req.body.imageCaptions || article.imageCaptions,
          video,
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

  // Stats route
  app.get("/api/stats", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // User stats or admin stats based on role
      const userId = req.user!.isAdmin ? undefined : req.user!.id;
      const stats = await storage.getArticleCountByStatus(userId);

      res.json(stats);
    } catch (error) {
      console.error("Error in GET /api/stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Handle article download as zip
  app.get("/api/articles/:id/download", async (req: Request, res: Response) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);

      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Admins can download any article, others can only download their own
      if (!req.user.isAdmin && article.userId !== req.user.id) {
        return res.status(403).json({ 
          message: "You can only download your own articles" 
        });
      }

      // Get the author
      const author = await storage.getUser(article.userId);
      if (!author) {
        return res.status(500).json({ message: "Author information not found" });
      }

      // Generate and send the zip file
      await downloadArticleAsZip(article, author, res);
      
    } catch (error) {
      console.error("Error downloading article:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to download article" });
      }
    }
  });

  // Delete article (admin only)
  app.delete("/api/articles/:id", async (req: Request, res: Response) => {
    if (!req.isAuthenticated() || !req.user?.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const id = parseInt(req.params.id);
      const article = await storage.getArticle(id);
      
      if (!article) {
        return res.status(404).json({ message: "Article not found" });
      }

      // Delete associated image and video files if they exist
      const filesToDelete: string[] = [];
      
      // Add images from the images array
      if (article.images) {
        try {
          const imagesList: string[] = JSON.parse(article.images);
          filesToDelete.push(...imagesList);
        } catch (error) {
          console.warn('Error parsing images JSON during deletion:', error);
        }
      }
      
      // Also include featured image if it exists and isn't already in the list
      if (article.featuredImage && !filesToDelete.includes(article.featuredImage)) {
        filesToDelete.push(article.featuredImage);
      }
      
      // Include video if it exists
      if (article.video) {
        filesToDelete.push(article.video);
      }
      
      // Delete all associated files
      for (const fileName of filesToDelete) {
        if (fileName.startsWith("/media/")) {
          const key = fileName.slice("/media/".length);
          const objectStorage = new Client();
          const result = await objectStorage.delete(key, { ignoreNotFound: true });
          if (!result.ok) {
            throw new Error(`Failed to delete media object ${key}: ${result.error.message}`);
          }
          console.log(`Deleted media object: ${key}`);
          continue;
        }

        const fullPath = path.join(process.cwd(), "uploads", fileName);
        if (fs.existsSync(fullPath)) {
          try {
            fs.unlinkSync(fullPath);
            console.log(`Deleted file: ${fileName}`);
          } catch (error) {
            console.warn(`Failed to delete file: ${fileName}`, error);
          }
        }
      }

      await storage.deleteArticle(id);
      res.json({ message: "Article deleted successfully" });
    } catch (error) {
      console.error("Error deleting article:", error);
      res.status(500).json({ message: "Failed to delete article" });
    }
  });


  
  // Debug route - only for development
  if (process.env.NODE_ENV === 'development') {
    app.get("/api/debug/article/:id", async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const article = await storage.getArticle(id);
        
        if (!article) {
          return res.status(404).json({ message: "Article not found" });
        }
        
        // Return raw article data
        res.json({
          article,
          contentLength: article.content ? article.content.length : 0,
          contentInfo: article.content ? {
            firstChars: JSON.stringify(article.content.substring(0, 30)),
            hasContent: !!article.content,
            trimmedLength: article.content.trim().length,
            hasTrimmedContent: article.content.trim().length > 0
          } : null
        });
      } catch (error) {
        res.status(500).json({ message: "Failed to fetch article debug info" });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
