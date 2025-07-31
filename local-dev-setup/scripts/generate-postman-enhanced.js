import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execa } from 'execa';
import dotenv from 'dotenv';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const log = console.log;
const { green, yellow, red } = chalk;

const OPENAPI_FILE = path.join(rootDir, 'docs/api/openapi.yaml');
const OUTPUT_FILE = path.join(rootDir, 'docs/api/postman/UMIG_API_V2_Collection.postman_collection.json');

async function generatePostmanCollection() {
  try {
    log(yellow('Generating Postman collection from OpenAPI specification...'));
    
    // Run the original generation command
    await execa('npx', ['openapi-to-postmanv2', '-s', OPENAPI_FILE, '-o', OUTPUT_FILE], {
      cwd: rootDir,
      stdio: 'inherit'
    });
    
    log(green('✓ Initial Postman collection generated'));
    
    // Load the generated collection
    const collectionContent = fs.readFileSync(OUTPUT_FILE, 'utf8');
    const collection = JSON.parse(collectionContent);
    
    // Get auth configuration from environment
    const authUsername = process.env.POSTMAN_AUTH_USERNAME || 'admin';
    const authPassword = process.env.POSTMAN_AUTH_PASSWORD || 'Spaceop!13';
    const baseUrl = process.env.POSTMAN_BASE_URL || 'http://localhost:8090';
    
    log(yellow('Enhancing collection with authentication and variables...'));
    
    // Add collection-level authentication
    collection.auth = {
      type: 'basic',
      basic: [
        {
          key: 'username',
          value: authUsername,
          type: 'string'
        },
        {
          key: 'password',
          value: authPassword,
          type: 'string'
        }
      ]
    };
    
    // Add collection variables
    if (!collection.variable) {
      collection.variable = [];
    }
    
    // Add baseUrl variable if not exists
    const baseUrlVar = collection.variable.find(v => v.key === 'baseUrl');
    if (baseUrlVar) {
      baseUrlVar.value = baseUrl;
      baseUrlVar.type = 'string';
    } else {
      collection.variable.push({
        key: 'baseUrl',
        value: baseUrl,
        type: 'string'
      });
    }
    
    // Add auth variables for potential override
    collection.variable.push(
      {
        key: 'authUsername',
        value: authUsername,
        type: 'string'
      },
      {
        key: 'authPassword',
        value: authPassword,
        type: 'string'
      }
    );
    
    // Update all requests to use the baseUrl variable
    function updateRequestUrls(items) {
      items.forEach(item => {
        if (item.request && item.request.url) {
          // Handle URL object format (most common in Postman collections)
          if (typeof item.request.url === 'object') {
            // Update host to use variable
            if (item.request.url.host) {
              item.request.url.host = ['{{baseUrl}}'];
            }
            
            // Update the raw URL to use baseUrl directly with the endpoint path
            if (item.request.url.path && Array.isArray(item.request.url.path)) {
              const endpointPath = '/' + item.request.url.path.join('/');
              const queryParams = item.request.url.query && item.request.url.query.length > 0 
                ? '?' + item.request.url.query.map(q => `${q.key}={{${q.key}}}`).join('&')
                : '';
              item.request.url.raw = `{{baseUrl}}${endpointPath}${queryParams}`;
            }
          } else if (typeof item.request.url === 'string') {
            // Handle string format (less common)
            // Simply replace any base URL with {{baseUrl}}
            item.request.url = item.request.url.replace(/^https?:\/\/[^\/]+\/rest\/scriptrunner\/latest\/custom/, '{{baseUrl}}');
          }
        }
        
        // Recursively process sub-items (folders)
        if (item.item && Array.isArray(item.item)) {
          updateRequestUrls(item.item);
        }
      });
    }
    
    // Apply URL updates to all items
    if (collection.item && Array.isArray(collection.item)) {
      updateRequestUrls(collection.item);
    }
    
    // Add collection description with configuration info
    collection.info.description = (collection.info.description || '') + 
      `\n\n## Configuration\n` +
      `This collection is configured with:\n` +
      `- **Base URL**: \`{{baseUrl}}\` (default: ${baseUrl})\n` +
      `- **Authentication**: Basic Auth with username \`{{authUsername}}\` and password \`{{authPassword}}\`\n\n` +
      `The base URL includes the full ScriptRunner REST endpoint path.\n` +
      `You can override these values in your Postman environment.`;
    
    // Write the enhanced collection back
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(collection, null, 2));
    
    log(green('✓ Collection enhanced with authentication and variables'));
    log(green(`✓ Postman collection saved to: ${OUTPUT_FILE}`));
    
    // Log configuration summary
    log('\n' + yellow('Configuration applied:'));
    log(`  Base URL: ${green(baseUrl)}`);
    log(`  Username: ${green(authUsername)}`);
    log(`  Password: ${green('*'.repeat(authPassword.length))}`);
    
  } catch (error) {
    log(red('Failed to generate Postman collection:'));
    log(red(error.message));
    process.exit(1);
  }
}

// Run the generation
generatePostmanCollection();