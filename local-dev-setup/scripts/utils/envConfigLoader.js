#!/usr/bin/env node

/**
 * Environment Configuration Loader
 * Phase 1 Security Enhancement - Environment Variable Support
 *
 * Loads and processes configuration files with environment variable substitution
 * Supports ${VAR_NAME:defaultValue} syntax in JSON configuration files
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load environment variables from .env file if exists
 */
function loadDotEnv() {
  const envPath = path.join(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        if (key) {
          process.env[key.trim()] = valueParts.join("=").trim();
        }
      }
    });
  }
}

/**
 * Replace environment variable placeholders in a string
 * Supports ${VAR_NAME:defaultValue} syntax
 */
function replaceEnvVars(str) {
  if (typeof str !== "string") return str;

  return str.replace(
    /\$\{([^:}]+)(?::([^}]*))?\}/g,
    (match, varName, defaultValue) => {
      const value = process.env[varName];
      if (value !== undefined) {
        return value;
      }
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      // If no default and env var not set, keep the placeholder
      console.warn(
        `Warning: Environment variable ${varName} not set and no default provided`,
      );
      return match;
    },
  );
}

/**
 * Process a configuration object recursively
 */
function processConfig(config) {
  if (typeof config === "string") {
    return replaceEnvVars(config);
  }

  if (Array.isArray(config)) {
    return config.map((item) => processConfig(item));
  }

  if (config && typeof config === "object") {
    const processed = {};
    for (const [key, value] of Object.entries(config)) {
      processed[key] = processConfig(value);
    }
    return processed;
  }

  return config;
}

/**
 * Load and process a JSON configuration file
 */
function loadConfig(configPath) {
  try {
    // Load environment variables first
    loadDotEnv();

    // Read the config file
    const rawConfig = fs.readFileSync(configPath, "utf8");
    const config = JSON.parse(rawConfig);

    // Process environment variable substitutions
    const processedConfig = processConfig(config);

    return processedConfig;
  } catch (error) {
    console.error(
      `Error loading configuration from ${configPath}:`,
      error.message,
    );
    throw error;
  }
}

/**
 * Save processed configuration to a file
 */
function saveConfig(config, outputPath) {
  try {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(outputPath, content, "utf8");
    console.log(`Configuration saved to ${outputPath}`);
  } catch (error) {
    console.error(
      `Error saving configuration to ${outputPath}:`,
      error.message,
    );
    throw error;
  }
}

// Export functions for use in other scripts
export { loadDotEnv, replaceEnvVars, processConfig, loadConfig, saveConfig };

// If run directly, process build-config.json
if (import.meta.url === `file://${process.argv[1]}`) {
  const configPath = path.join(__dirname, "../../build-config.json");
  const outputPath = path.join(__dirname, "../../build-config.processed.json");

  try {
    const config = loadConfig(configPath);

    // Mask sensitive values for logging
    const logConfig = JSON.parse(JSON.stringify(config));
    if (logConfig.database?.connection?.password) {
      logConfig.database.connection.password = "***MASKED***";
    }

    console.log("Processed configuration:");
    console.log(JSON.stringify(logConfig, null, 2));

    // Optionally save processed config (for debugging)
    if (process.argv.includes("--save")) {
      saveConfig(config, outputPath);
    }
  } catch (error) {
    console.error("Failed to process configuration:", error);
    process.exit(1);
  }
}
