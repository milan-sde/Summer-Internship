// src/shared/database/connection.ts
import mongoose from "mongoose";

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected: boolean = false;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      console.log("Database already connected");
      return;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    try {
      console.log("Connecting to MongoDB...");

      await mongoose.connect(mongoUri);
      this.isConnected = true;

      console.log("✅ MongoDB connected successfully");
      console.log(`📦 Database: ${mongoose.connection.name}`);

      // Drop the obsolete unique index on contentsubmissions if it exists
      try {
        const db = mongoose.connection.db;
        if (db) {
          const collections = await db.listCollections({ name: "contentsubmissions" }).toArray();
          if (collections.length > 0) {
            const indexes = await db.collection("contentsubmissions").indexes();
            const uniqueIndexExists = indexes.some(idx => idx.name === "campaignId_1_influencerId_1");
            if (uniqueIndexExists) {
              await db.collection("contentsubmissions").dropIndex("campaignId_1_influencerId_1");
              console.log("✅ Successfully dropped unique index campaignId_1_influencerId_1 from contentsubmissions collection");
            }
          }
        }
      } catch (err) {
        console.error("⚠️ Failed to drop unique index on contentsubmissions:", err);
      }

      // Monitor connection events
      mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error);
        this.isConnected = false;
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("⚠️ MongoDB disconnected");
        this.isConnected = false;
      });
    } catch (error) {
      console.error("❌ MongoDB connection failed:", error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;

    await mongoose.disconnect();
    this.isConnected = false;
    console.log("📴 MongoDB disconnected");
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Singleton instance
const dbInstance = DatabaseConnection.getInstance();

export const connectDatabase = () => dbInstance.connect();
export const disconnectDatabase = () => dbInstance.disconnect();
export const getDbStatus = () => dbInstance.getConnectionStatus();
