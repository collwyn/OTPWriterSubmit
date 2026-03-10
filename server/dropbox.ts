import { Dropbox } from 'dropbox';
import fs from 'fs';
import path from 'path';

let dropboxClient: Dropbox | null = null;

/**
 * Initialize Dropbox client with access token
 */
export function initDropbox() {
  const accessToken = process.env.DROPBOX_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error('CRITICAL: Dropbox access token not found (DROPBOX_ACCESS_TOKEN env var). Uploaded images will NOT persist across server restarts.');
    return null;
  }
  
  try {
    dropboxClient = new Dropbox({ accessToken });
    return dropboxClient;
  } catch (error) {
    console.error('Error initializing Dropbox client:', error);
    return null;
  }
}

/**
 * Upload a file to Dropbox
 * @param filePath Local path to the file
 * @param userId User ID to use in folder structure
 * @param filename Filename to use in Dropbox
 */
export async function uploadToDropbox(filePath: string, userId: number, filename: string): Promise<string | null> {
  if (!dropboxClient) {
    initDropbox();
    if (!dropboxClient) {
      return null;
    }
  }
  
  try {
    const fileContent = fs.readFileSync(filePath);
    const dropboxPath = `/submissions/user_${userId}/${filename}`;
    
    const response = await dropboxClient.filesUpload({
      path: dropboxPath,
      contents: fileContent,
      mode: { '.tag': 'overwrite' }
    });
    
    // Get a shared link for the file
    const linkResponse = await dropboxClient.sharingCreateSharedLinkWithSettings({
      path: response.result.path_display || dropboxPath
    });
    
    return linkResponse.result.url;
  } catch (error) {
    console.error('Error uploading to Dropbox:', error);
    return null;
  }
}

/**
 * Creates a folder in Dropbox for a user if it doesn't exist
 * @param userId User ID to create folder for
 */
export async function createUserFolder(userId: number): Promise<boolean> {
  if (!dropboxClient) {
    initDropbox();
    if (!dropboxClient) {
      return false;
    }
  }
  
  const folderPath = `/submissions/user_${userId}`;
  
  try {
    // Check if folder exists
    try {
      await dropboxClient.filesGetMetadata({
        path: folderPath
      });
      // Folder exists, return true
      return true;
    } catch (err) {
      // Folder doesn't exist, create it
      await dropboxClient.filesCreateFolderV2({
        path: folderPath
      });
      return true;
    }
  } catch (error) {
    console.error('Error creating user folder in Dropbox:', error);
    return false;
  }
}
