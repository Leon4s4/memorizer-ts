#!/usr/bin/env node

/**
 * Post-install script to download AI models
 *
 * Downloads:
 * - nomic-embed-text-v1.5 (embedding model, ~274MB)
 * - TinyLlama-1.1B-Chat (LLM model, ~637MB)
 *
 * Total: ~920MB
 */

import { mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Model directory (default to ~/.memorizer/models)
const MODEL_DIR = process.env.MEMORIZER_MODEL_PATH || join(homedir(), '.memorizer', 'models');

// Model URLs and info
const MODELS = {
  embedding: {
    name: 'nomic-embed-text-v1.5',
    path: join(MODEL_DIR, 'nomic-embed-text'),
    size: '~274MB',
    description: 'Embedding model for semantic search (768D)',
    // Transformers.js will download automatically on first use
    autoDownload: true,
  },
  llm: {
    name: 'TinyLlama-1.1B-Chat-v1.0-Q4_K_M.gguf',
    path: join(MODEL_DIR, 'tinyllama-1.1b'),
    size: '~637MB',
    description: 'LLM model for title generation',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    filename: 'model.gguf',
    autoDownload: false, // Download on first use to keep install fast
  },
};

async function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   Memorizer Post-Install Setup               ║
║   Airgapped AI Memory Service                 ║
║                                               ║
╚═══════════════════════════════════════════════╝
`);

  try {
    // Create model directory structure
    console.log('📁 Setting up model directories...\n');
    await ensureDirectoryExists(MODEL_DIR);
    await ensureDirectoryExists(MODELS.embedding.path);
    await ensureDirectoryExists(MODELS.llm.path);

    // Create data directory
    const dataDir = process.env.MEMORIZER_DATA_PATH || join(homedir(), '.memorizer', 'data');
    await ensureDirectoryExists(dataDir);

    console.log('\n✅ Directory structure created:\n');
    console.log(`   Models: ${MODEL_DIR}`);
    console.log(`   Data:   ${dataDir}\n`);

    // Info about models
    console.log('📦 AI Models Information:\n');
    console.log(`   1. ${MODELS.embedding.name}`);
    console.log(`      Size: ${MODELS.embedding.size}`);
    console.log(`      Path: ${MODELS.embedding.path}`);
    console.log(`      Status: Will download automatically on first use\n`);

    console.log(`   2. ${MODELS.llm.name}`);
    console.log(`      Size: ${MODELS.llm.size}`);
    console.log(`      Path: ${MODELS.llm.path}`);
    console.log(`      Status: Will download automatically on first use\n`);

    console.log('ℹ️  Models will be downloaded automatically when you first start the server.');
    console.log('   This keeps the initial install fast (~10MB).\n');

    console.log('🚀 Installation complete! You can now run:\n');
    console.log('   npx memorizer start    # Start HTTP server + Web UI');
    console.log('   npx memorizer mcp      # Start MCP server for Claude\n');

    console.log('📚 Documentation:');
    console.log('   https://github.com/yourusername/memorizer-ts#readme\n');

    console.log('💡 Optional: Install Redis for background jobs');
    console.log('   macOS:  brew install redis && brew services start redis');
    console.log('   Linux:  sudo apt-get install redis-server && sudo systemctl start redis');
    console.log('   Docker: docker run -d -p 6379:6379 redis:latest\n');

  } catch (error) {
    console.error('❌ Post-install setup failed:', error.message);
    console.error('\nYou can still use Memorizer, but you may need to:');
    console.error(`1. Manually create: ${MODEL_DIR}`);
    console.error(`2. Models will download on first use\n`);
    // Don't fail the install - just warn
    process.exit(0);
  }
}

// Only run if called directly (not when imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(0); // Don't fail npm install
  });
}
