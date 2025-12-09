#!/usr/bin/env node

/**
 * Model Download Script
 *
 * Downloads required AI models for Memorizer:
 * 1. TinyLlama 1.1B (Q4_K_M quantized GGUF) - ~637MB
 * 2. Transformers.js models are downloaded automatically on first use
 *
 * Usage:
 *   npm run download-models
 *   node scripts/download-models.ts
 */

import { createWriteStream, existsSync, mkdirSync } from 'fs';
import { stat, unlink } from 'fs/promises';
import { get } from 'https';
import { join } from 'path';
import { homedir } from 'os';
import { pipeline } from 'stream/promises';

// Model configuration
const MODELS = {
  tinyllama: {
    name: 'TinyLlama 1.1B Chat (Q4_K_M)',
    filename: 'tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    url: 'https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf',
    size: 669014080, // ~637 MB
  },
};

// Paths
const DEFAULT_MODELS_DIR = join(homedir(), '.memorizer', 'models');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

async function downloadFile(url: string, destination: string, expectedSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    log(`Downloading from: ${url}`, 'blue');
    log(`Saving to: ${destination}`, 'blue');

    let downloaded = 0;
    let lastProgress = 0;

    const request = get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        const redirectUrl = response.headers.location;
        if (!redirectUrl) {
          reject(new Error('Redirect without location header'));
          return;
        }
        downloadFile(redirectUrl, destination, expectedSize)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const fileStream = createWriteStream(destination);

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const progress = Math.floor((downloaded / expectedSize) * 100);

        // Update progress every 5%
        if (progress - lastProgress >= 5 || progress === 100) {
          log(
            `Progress: ${progress}% (${formatBytes(downloaded)} / ${formatBytes(expectedSize)})`,
            'yellow'
          );
          lastProgress = progress;
        }
      });

      pipeline(response, fileStream)
        .then(() => {
          log('Download complete!', 'green');
          resolve();
        })
        .catch(reject);
    });

    request.on('error', reject);
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Download timeout'));
    });
  });
}

async function ensureModelDownloaded(
  modelKey: keyof typeof MODELS,
  modelsDir: string
): Promise<void> {
  const model = MODELS[modelKey];
  const modelPath = join(modelsDir, model.filename);

  // Check if already downloaded
  if (existsSync(modelPath)) {
    try {
      const stats = await stat(modelPath);
      if (stats.size === model.size) {
        log(`✓ ${model.name} already downloaded`, 'green');
        return;
      } else {
        log(
          `⚠ ${model.name} found but size mismatch (expected ${formatBytes(model.size)}, got ${formatBytes(stats.size)})`,
          'yellow'
        );
        log('Removing and re-downloading...', 'yellow');
        await unlink(modelPath);
      }
    } catch (error) {
      log(`Error checking existing file: ${error}`, 'red');
    }
  }

  log(`\nDownloading ${model.name}...`, 'blue');
  log(`Size: ${formatBytes(model.size)}`, 'blue');

  try {
    await downloadFile(model.url, modelPath, model.size);

    // Verify download
    const stats = await stat(modelPath);
    if (stats.size !== model.size) {
      throw new Error(
        `Download incomplete: expected ${formatBytes(model.size)}, got ${formatBytes(stats.size)}`
      );
    }

    log(`✓ ${model.name} downloaded successfully`, 'green');
  } catch (error) {
    // Clean up partial download
    if (existsSync(modelPath)) {
      await unlink(modelPath);
    }
    throw error;
  }
}

async function main() {
  const modelsDir = process.env.MEMORIZER_MODEL_PATH || DEFAULT_MODELS_DIR;

  log('\n╔═══════════════════════════════════════════════╗', 'blue');
  log('║   Memorizer Model Downloader                  ║', 'blue');
  log('╚═══════════════════════════════════════════════╝\n', 'blue');

  log(`Models directory: ${modelsDir}`, 'blue');

  // Ensure models directory exists
  if (!existsSync(modelsDir)) {
    log('Creating models directory...', 'yellow');
    mkdirSync(modelsDir, { recursive: true });
  }

  try {
    // Download TinyLlama
    await ensureModelDownloaded('tinyllama', modelsDir);

    // Note about Transformers.js
    log('\n📝 Note:', 'blue');
    log(
      'Transformers.js models (nomic-embed-text) will be downloaded automatically',
      'blue'
    );
    log('on first use and cached in ~/.cache/transformers/', 'blue');

    log('\n✓ All models ready!', 'green');
    log('\nYou can now start the server with:', 'blue');
    log('  cd packages/server && npm run dev', 'blue');
  } catch (error) {
    log('\n✗ Model download failed!', 'red');
    log(`Error: ${error}`, 'red');
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
