import { sql } from "drizzle-orm";
import { db } from "./db";
import { users, articles } from "@shared/schema";
import { hashPassword } from "./auth";

export async function setupDatabase() {
  try {
    console.log('Setting up database tables...');
    
    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        is_admin BOOLEAN NOT NULL DEFAULT false
      )
    `);
    
    // Create articles table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        keywords TEXT,
        target_audience TEXT,
        featured_image TEXT,
        dropbox_link TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        word_count INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    
    // Check if we have an admin user, if not create one
    const adminUsers = await db.select().from(users).where(sql`is_admin = true`);
    
    if (adminUsers.length === 0) {
      console.log('Creating admin user...');
      
      // Create admin user
      await db.insert(users).values({
        username: 'admin',
        email: 'admin@ourtimepress.com',
        password: await hashPassword('admin123'), // Default password
        isAdmin: true
      });
      
      console.log('Admin user created');
    }
    
    console.log('Database setup complete');
  } catch (error) {
    console.error('Error setting up database:', error);
    throw error;
  }
}