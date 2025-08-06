import archiver from 'archiver';
import path from 'path';
import fs from 'fs-extra';
import { Request, Response } from 'express';
import { Article, User } from '@shared/schema';

/**
 * Creates a zip archive of an article and its images
 * 
 * @param article Article to package
 * @param user User who created the article
 * @param res Express response object to stream the zip file
 */
export async function downloadArticleAsZip(article: Article, user: User, res: Response): Promise<void> {
  try {
    // Set up the zip file name
    const zipFileName = `${article.title.replace(/[^a-zA-Z0-9]/g, '_')}_${article.id}.zip`;
    
    // Set up headers for file download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`);
    
    // Create a zip archive and pipe it to the response
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });
    
    // Log any warnings to the console
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('Warning while creating archive:', err);
      } else {
        throw err;
      }
    });
    
    // Log any errors
    archive.on('error', (err) => {
      console.error('Error creating article archive:', err);
      throw err;
    });
    
    // Pipe the archive to the response
    archive.pipe(res);
    
    // Add a text file with the article content
    const articleTextContent = `# ${article.title}\n\n` +
      `Author: ${user.username}\n` +
      `Date: ${new Date(article.createdAt).toLocaleDateString()}\n` +
      `Category: ${article.category}\n` +
      (article.keywords ? `Keywords: ${article.keywords}\n` : '') +
      (article.summary ? `\n## Summary\n${article.summary}\n` : '') +
      `\n## Content\n${article.content}`;
    
    archive.append(articleTextContent, { name: 'article.txt' });
    
    // Include metadata file with JSON data
    const metadataJson = JSON.stringify({
      id: article.id,
      title: article.title,
      author: user.username,
      authorEmail: user.email,
      category: article.category,
      status: article.status,
      createdAt: article.createdAt,
      updatedAt: article.updatedAt,
      wordCount: article.wordCount,
      targetAudience: article.targetAudience,
      keywords: article.keywords
    }, null, 2);
    
    archive.append(metadataJson, { name: 'metadata.json' });
    
    // Add all images if they exist
    const imagesToInclude: string[] = [];
    
    // Add images from the images array
    if (article.images) {
      try {
        const imagesList: string[] = JSON.parse(article.images);
        imagesToInclude.push(...imagesList);
      } catch (error) {
        console.warn('Error parsing images JSON:', error);
      }
    }
    
    // Also include featured image if it exists and isn't already in the list
    if (article.featuredImage && !imagesToInclude.includes(article.featuredImage)) {
      imagesToInclude.push(article.featuredImage);
    }
    
    // Add all images to the archive
    for (const imageName of imagesToInclude) {
      const imagePath = path.join(process.cwd(), 'uploads', imageName);
      
      // Check if image exists
      if (await fs.pathExists(imagePath)) {
        console.log(`Adding image to archive: ${imageName}`);
        archive.append(fs.createReadStream(imagePath), { 
          name: `images/${imageName}` 
        });
      } else {
        console.warn(`Image file not found: ${imagePath}`);
      }
    }
    
    // Finalize the archive
    await archive.finalize();
    
  } catch (error) {
    console.error('Failed to create article zip archive:', error);
    // Handle errors if not already sent
    if (!res.headersSent) {
      res.status(500).json({ message: 'Failed to create download package' });
    }
  }
}