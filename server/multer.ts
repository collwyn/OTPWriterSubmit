import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request, Response } from 'express';

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

// File filter to allow JPG images and MP4 videos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Accept jpg/jpeg images or mp4 videos
  if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg' || file.mimetype === 'video/mp4') {
    cb(null, true);
  } else {
    cb(new Error('Only JPG images and MP4 videos are allowed'));
  }
};

// Create multer upload instance with size limit of 5GB per file, max 10 files
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 * 1024, // 5GB in bytes per file
    files: 10, // Maximum 10 files
  }
});

// Handle file upload errors
export const handleUploadError = (err: any, req: Request, res: Response, next: (error?: any) => void) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Maximum size is 5GB.' });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};
