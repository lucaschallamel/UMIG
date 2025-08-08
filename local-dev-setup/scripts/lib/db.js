import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Replicate __dirname functionality in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Find and load .env file from the parent directory
const envPath = path.resolve(__dirname, "../../.env");
if (!fs.existsSync(envPath)) {
  console.error(
    "ERROR: .env file not found in /local-dev-setup. Please create it from .env.example.",
  );
  process.exit(1);
}
dotenv.config({ path: envPath });

// Helper to ensure required environment variables are set
function requireEnv(varName) {
  if (!process.env[varName]) {
    console.error(
      `ERROR: Required environment variable ${varName} is missing from .env.`,
    );
    process.exit(1);
  }
  return process.env[varName];
}

// Database configuration object
const DB_CONFIG = {
  host: requireEnv("POSTGRES_HOST"),
  port: requireEnv("POSTGRES_PORT"),
  user: requireEnv("UMIG_DB_USER"),
  password: requireEnv("UMIG_DB_PASSWORD"),
  database: requireEnv("UMIG_DB_NAME"),
};

// Create a new client instance
const client = new Client(DB_CONFIG);

// Add detailed event logging for diagnostics
client.on("connect", () => {
  console.log("[DB_LOG] Client has connected");
});

client.on("end", () => {
  console.log("[DB_LOG] Client has disconnected");
});

client.on("error", (err) => {
  console.error("[DB_LOG] Database client error:", err.stack);
});

const connect = async () => {
  await client.connect();
  console.log("Connected to database.");
};

const disconnect = async () => {
  await client.end();
  console.log("Disconnected from database.");
};

// Export the client and connect/disconnect functions
export { client, connect, disconnect };
