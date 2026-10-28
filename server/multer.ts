import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { NextFunction, Request, Response } from 'express';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    // Create a unique filename with timestamp - always use 'featuredImage' prefix for consistency
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'featuredImage-' + uniqueSuffix + ext);
  }
});

// File filter to allow JPG, PNG, WEBP images and MP4 videos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept jpg/jpeg, png, webp images or mp4 videos
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/webp' ||
    file.mimetype === 'video/mp4'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Only JPG, PNG and WEBP images and MP4 videos are allowed'));
  }
};

// Create multer upload instance with a 200MB maximum per file and 11 files total.
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB in bytes per file
    files: 11, // Maximum 10 images and 1 video
  }
});

export const validateImageFileSize = (req: Request, res: Response, next: NextFunction) => {
  const uploadedFiles = (req as Request & {
    files?: { images?: Array<{ path: string; size: number }>; video?: Array<{ path: string; size: number }> };
  }).files;
  const images = uploadedFiles?.images || [];

  if (images.some((file) => file.size > 10 * 1024 * 1024)) {
    const allFiles = Object.values(uploadedFiles || {}).flat();
    for (const file of allFiles) {
      try {
        fs.unlinkSync(file.path);
      } catch (error) {
        console.error('Failed to remove oversized upload:', error);
      }
    }

    return res.status(400).json({ message: 'Image files must be 10MB or smaller.' });
  }

  next();
};

// Handle file upload errors
export const handleUploadError = (err: any, req: Request, res: Response, next: (error?: any) => void) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Images must be 10MB or smaller; videos must be 200MB or smaller.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
