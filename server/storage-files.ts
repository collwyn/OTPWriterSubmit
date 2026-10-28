import { Client } from "@replit/object-storage";
import fs from "node:fs/promises";

const objectStorage = new Client();

export async function saveFile(localFilePath: string, key: string): Promise<string> {
  try {
    const contents = await fs.readFile(localFilePath);
    const result = await objectStorage.uploadFromBytes(key, contents);

    if (!result.ok) {
      throw new Error(`Object Storage upload failed: ${result.error.message}`);
    }

    await fs.unlink(localFilePath);
    return key;
  } catch (error) {
    await fs.unlink(localFilePath).catch(() => undefined);
    throw error;
  }
}

export async function getFile(key: string): Promise<Buffer> {
  const result = await objectStorage.downloadAsBytes(key);
  if (!result.ok) {
    throw result.error;
  }

  return result.value[0];
}
