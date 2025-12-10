#!/usr/bin/env node

/**
 * Post-install script for BUNDLED models version
 * Copies pre-downloaded models from package to user directory
 */

import { mkdir, cp, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Source: bundled models in package
const PACKAGE_MODELS_DIR = join(__dirname, '..', 'models');

// Destination: user's model directory
const USER_MODEL_DIR = process.env.MEMORIZER_MODEL_PATH || join(homedir(), '.memorizer', 'models');

async function ensureDirectoryExists(dirPath) {
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
}

async function copyModelsIfNeeded() {
  console.log(`
╔═══════════════════════════════════════════════╗
║                                               ║
║   Memorizer Offline Installation             ║
║   Airgapped AI Memory Service                 ║
║                                               ║
╚═══════════════════════════════════════════════╝
`);

  try {
    // Verify sharp offline configuration
    console.log('🔧 Verifying offline mode for sharp...');
    try {
      const { readFileSync } = await import('fs');
      const npmrcPath = join(__dirname, '..', '.npmrc');
      const npmrcContent = readFileSync(npmrcPath, 'utf8');
      if (npmrcContent.includes('sharp_binary_host=https://localhost:1/noop')) {
        console.log('✓ Sharp is configured for offline mode (no downloads)\n');
      }
    } catch (err) {
      console.warn('⚠️  Could not verify sharp configuration\n');
    }

    // Create user model directory
    console.log('📁 Setting up model directories...\n');
    await ensureDirectoryExists(USER_MODEL_DIR);

    // Create data directory
    const dataDir = process.env.MEMORIZER_DATA_PATH || join(homedir(), '.memorizer', 'data');
    await ensureDirectoryExists(dataDir);

    console.log(`   Models: ${USER_MODEL_DIR}`);
    console.log(`   Data:   ${dataDir}\n`);

    // Check if models already exist
    const embeddingPath = join(USER_MODEL_DIR, 'nomic-embed-text');
    const llmPath = join(USER_MODEL_DIR, 'tinyllama-1.1b');

    const embeddingExists = existsSync(embeddingPath);
    const llmExists = existsSync(llmPath);

    if (embeddingExists && llmExists) {
      console.log('ℹ️  Models already exist, skipping copy...\n');
    } else {
      console.log('📦 Copying bundled AI models...\n');

      // Copy embedding model
      if (!embeddingExists && existsSync(join(PACKAGE_MODELS_DIR, 'nomic-embed-text'))) {
        console.log('   Copying nomic-embed-text (~274MB)...');
        await cp(join(PACKAGE_MODELS_DIR, 'nomic-embed-text'), embeddingPath, { recursive: true });
        console.log('   ✅ Embedding model copied\n');
      }

      // Copy LLM model
      if (!llmExists && existsSync(join(PACKAGE_MODELS_DIR, 'tinyllama-1.1b'))) {
        console.log('   Copying TinyLlama (~637MB)...');
        await cp(join(PACKAGE_MODELS_DIR, 'tinyllama-1.1b'), llmPath, { recursive: true });
        console.log('   ✅ LLM model copied\n');
      }

      console.log('✅ All models installed!\n');
    }

    console.log('🚀 Installation complete! You can now run:\n');
    console.log('   memorizer start    # Start HTTP server + Web UI');
    console.log('   memorizer mcp      # Start MCP server for Claude\n');

    console.log('📚 Documentation:');
    console.log('   https://github.com/Leon4s4/memorizer-ts#readme\n');

    console.log('✨ This is an OFFLINE installation - no internet required!\n');

  } catch (error) {
    console.error('❌ Post-install setup failed:', error.message);
    console.error('\nYou can still use Memorizer, but models may not be available.');
    console.error(`Model directory: ${USER_MODEL_DIR}\n`);
    // Don't fail the install
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  copyModelsIfNeeded().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(0);
  });
}
