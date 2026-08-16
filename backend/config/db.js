import mongoose from "mongoose";
import { env, isProduction } from "./env.js";
import { logger } from "../utils/logger.js";

// ----------------------------------------------------------------------
// Memora Backend — db.js
// Single mongoose connection, shared across the app. Handles connection
// events, retries on initial connect failure, and a clean shutdown hook
// so `server.js` can close the connection on SIGTERM without leaking.
// ----------------------------------------------------------------------

mongoose.set("strictQuery", true);

let isConnecting = false;

export async function connectDB({ retries = 5, retryDelayMs = 3000 } = {}) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (isConnecting) return mongoose.connection;

  isConnecting = true;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(env.MONGODB_URI, {
        maxPoolSize: isProduction ? 20 : 5,
        serverSelectionTimeoutMS: 10000,
      });
      isConnecting = false;
      logger.info(`MongoDB connected → ${mongoose.connection.name}`);
      return mongoose.connection;
    } catch (err) {
      logger.error(`MongoDB connection attempt ${attempt}/${retries} failed: ${err.message}`);
      if (attempt === retries) {
        isConnecting = false;
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }
}

export async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info("MongoDB connection closed");
}

// ---- Connection event logging ---------------------------------------------
mongoose.connection.on("error", (err) => {
  logger.error(`MongoDB error: ${err.message}`);
});

mongoose.connection.on("disconnected", () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on("reconnected", () => {
  logger.info("MongoDB reconnected");
});

export default mongoose;