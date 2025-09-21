import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execa } from "execa";
import dotenv from "dotenv";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../.env") });

const log = console.log;
const { green, yellow, red } = chalk;

const OPENAPI_FILE = path.join(rootDir, "docs/api/openapi.yaml");
const OUTPUT_FILE = path.join(
  rootDir,
  "docs/api/postman/UMIG_API_V2_Collection.postman_collection.json",
);

async function generatePostmanCollection() {
  try {
    log(yellow("Generating Postman collection from OpenAPI specification..."));

    // Run the original generation command
    await execa(
      "npx",
      ["openapi-to-postmanv2", "-s", OPENAPI_FILE, "-o", OUTPUT_FILE],
      {
        cwd: rootDir,
        stdio: "inherit",
      },
    );

    log(green("✓ Initial Postman collection generated"));

    // Load the generated collection
    const collectionContent = fs.readFileSync(OUTPUT_FILE, "utf8");
    const collection = JSON.parse(collectionContent);

    // Get configuration from environment
    const baseUrl = process.env.POSTMAN_BASE_URL || "http://localhost:8090";
    const defaultSessionId =
      process.env.POSTMAN_SESSION_ID || "EXTRACT_FROM_BROWSER";

    log(
      yellow(
        "Enhancing collection with session-based authentication and variables...",
      ),
    );

    // Remove any existing basic auth and set up for session-based auth
    // Collection-level auth will be handled by environment variables and headers
    if (collection.auth) {
      delete collection.auth;
    }

    // Add collection variables
    if (!collection.variable) {
      collection.variable = [];
    }

    // Add baseUrl variable if not exists
    const baseUrlVar = collection.variable.find((v) => v.key === "baseUrl");
    if (baseUrlVar) {
      baseUrlVar.value = baseUrl;
      baseUrlVar.type = "string";
    } else {
      collection.variable.push({
        key: "baseUrl",
        value: baseUrl,
        type: "string",
      });
    }

    // Add session-based authentication variables
    collection.variable.push(
      {
        key: "jsessionid",
        value: defaultSessionId,
        type: "string",
        description:
          "Session ID extracted from browser. Extract from Developer Tools > Application > Cookies > JSESSIONID",
      },
      {
        key: "sessionCookie",
        value: `JSESSIONID={{jsessionid}}`,
        type: "string",
        description: "Complete cookie header value for session authentication",
      },
    );

    // Update all requests to use session-based authentication
    function updateRequestsForSessionAuth(items) {
      items.forEach((item) => {
        if (item.request) {
          // Update URL to use baseUrl variable
          if (item.request.url) {
            // Handle URL object format (most common in Postman collections)
            if (typeof item.request.url === "object") {
              // Update host to use variable
              if (item.request.url.host) {
                item.request.url.host = ["{{baseUrl}}"];
              }

              // Update the raw URL to use baseUrl directly with the endpoint path
              if (
                item.request.url.path &&
                Array.isArray(item.request.url.path)
              ) {
                const endpointPath = "/" + item.request.url.path.join("/");
                const queryParams =
                  item.request.url.query && item.request.url.query.length > 0
                    ? "?" +
                      item.request.url.query
                        .map((q) => `${q.key}={{${q.key}}}`)
                        .join("&")
                    : "";
                item.request.url.raw = `{{baseUrl}}${endpointPath}${queryParams}`;
              }
            } else if (typeof item.request.url === "string") {
              // Handle string format (less common)
              // Simply replace any base URL with {{baseUrl}}
              item.request.url = item.request.url.replace(
                /^https?:\/\/[^\/]+\/rest\/scriptrunner\/latest\/custom/,
                "{{baseUrl}}",
              );
            }
          }

          // Remove any existing basic auth
          if (item.request.auth) {
            delete item.request.auth;
          }

          // Ensure headers array exists
          if (!item.request.header) {
            item.request.header = [];
          }

          // Remove existing basic auth headers if any
          item.request.header = item.request.header.filter(
            (header) => header.key !== "Authorization",
          );

          // Add required session-based headers
          const requiredHeaders = [
            {
              key: "Cookie",
              value: "{{sessionCookie}}",
              type: "text",
              description: "Session cookie for authentication",
            },
            {
              key: "X-Requested-With",
              value: "XMLHttpRequest",
              type: "text",
              description: "Required header for AJAX requests",
            },
          ];

          // Add headers if they don't already exist
          requiredHeaders.forEach((requiredHeader) => {
            const existingHeader = item.request.header.find(
              (header) => header.key === requiredHeader.key,
            );
            if (!existingHeader) {
              item.request.header.push(requiredHeader);
            } else {
              // Update existing header to use session values
              existingHeader.value = requiredHeader.value;
              existingHeader.description = requiredHeader.description;
            }
          });

          // Ensure Accept header exists with proper value
          const acceptHeader = item.request.header.find(
            (header) => header.key === "Accept",
          );
          if (acceptHeader) {
            acceptHeader.value = "application/json";
          } else {
            item.request.header.push({
              key: "Accept",
              value: "application/json",
              type: "text",
              description: "Content type for API responses",
            });
          }

          // For POST/PUT requests, ensure Content-Type is set
          if (item.request.method === "POST" || item.request.method === "PUT") {
            const contentTypeHeader = item.request.header.find(
              (header) => header.key === "Content-Type",
            );
            if (!contentTypeHeader) {
              item.request.header.push({
                key: "Content-Type",
                value: "application/json",
                type: "text",
                description: "Content type for request body",
              });
            }
          }
        }

        // Recursively process sub-items (folders)
        if (item.item && Array.isArray(item.item)) {
          updateRequestsForSessionAuth(item.item);
        }
      });
    }

    // Apply session-based authentication updates to all items
    if (collection.item && Array.isArray(collection.item)) {
      updateRequestsForSessionAuth(collection.item);
    }

    // Add collection description with session configuration info
    collection.info.description =
      (collection.info.description || "") +
      `\n\n## ✅ Session-Based Authentication Configuration\n` +
      `This collection is configured for session-based authentication with:\n` +
      `- **Base URL**: \`{{baseUrl}}\` (default: ${baseUrl})\n` +
      `- **Session Cookie**: \`{{sessionCookie}}\` (extract JSESSIONID from browser)\n` +
      `- **Required Headers**: Cookie, X-Requested-With, Accept\n\n` +
      `### Setup Instructions:\n` +
      `1. Login to Confluence at ${baseUrl}\n` +
      `2. Open Developer Tools → Application → Cookies\n` +
      `3. Copy JSESSIONID value\n` +
      `4. Update {{jsessionid}} environment variable\n\n` +
      `### Working Example:\n` +
      `\`\`\`bash\n` +
      `curl -H "Cookie: JSESSIONID=YOUR_SESSION_ID" \\\n` +
      `     -H "X-Requested-With: XMLHttpRequest" \\\n` +
      `     -H "Accept: application/json" \\\n` +
      `     "${baseUrl}/rest/scriptrunner/latest/custom/teams"\n` +
      `\`\`\`\n\n` +
      `**Note**: Sessions expire after ~30 minutes of inactivity. Re-extract JSESSIONID when needed.`;

    // Write the enhanced collection back
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));

    log(
      green(
        "✓ Collection enhanced with session-based authentication and variables",
      ),
    );
    log(green(`✓ Postman collection saved to: ${OUTPUT_FILE}`));

    // Log configuration summary
    log("\n" + yellow("Session-based authentication configuration applied:"));
    log(`  Base URL: ${green(baseUrl)}`);
    log(`  Session Variable: ${green("{{jsessionid}}")}`);
    log(`  Cookie Header: ${green("{{sessionCookie}}")}`);
    log(`  Required Headers: ${green("Cookie, X-Requested-With, Accept")}`);
    log("\n" + yellow("Next steps:"));
    log(`  1. Login to Confluence at ${baseUrl}`);
    log(`  2. Extract JSESSIONID from browser Developer Tools`);
    log(`  3. Update {{jsessionid}} environment variable in Postman`);
    log(`  4. Test with teams endpoint first`);
  } catch (error) {
    log(red("Failed to generate Postman collection:"));
    log(red(error.message));
    process.exit(1);
  }
}

// Run the generation
generatePostmanCollection();
