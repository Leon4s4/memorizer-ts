#!/usr/bin/env node

/**
 * Download nomic-embed-text model from Hugging Face
 * This bundles the model for offline use
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import https from 'https';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const MODEL_DIR = join(__dirname, '..', 'models', 'nomic-embed-text');

// Files needed for nomic-embed-text-v1.5 (quantized INT8)
const MODEL_FILES = [
  'config.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'model.safetensors', // or onnx/model_quantized.onnx for quantized version
  'special_tokens_map.json',
];

const HF_MODEL_ID = 'nomic-ai/nomic-embed-text-v1.5';
const BASE_URL = `https://huggingface.co/${HF_MODEL_ID}/resolve/main`;

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      const chunks = [];
      let totalSize = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedSize = 0;

      response.on('data', (chunk) => {
        chunks.push(chunk);
        downloadedSize += chunk.length;

        if (totalSize > 0) {
          const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
          process.stdout.write(`\r   Progress: ${progress}% (${(downloadedSize / 1024 / 1024).toFixed(1)}MB / ${(totalSize / 1024 / 1024).toFixed(1)}MB)`);
        }
      });

      response.on('end', async () => {
        process.stdout.write('\n');
        const buffer = Buffer.concat(chunks);
        await writeFile(destPath, buffer);
        resolve();
      });

      response.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log(`
╔═══════════════════════════════════════════════╗
║  Downloading nomic-embed-text model          ║
║  for offline installation                     ║
╚═══════════════════════════════════════════════╝
`);

  try {
    // Create model directory
    if (!existsSync(MODEL_DIR)) {
      await mkdir(MODEL_DIR, { recursive: true });
    }

    console.log(`\n📁 Model directory: ${MODEL_DIR}\n`);

    // Download each file
    for (const file of MODEL_FILES) {
      const url = `${BASE_URL}/${file}`;
      const destPath = join(MODEL_DIR, file);

      if (existsSync(destPath)) {
        console.log(`✓ Skipping ${file} (already exists)`);
        continue;
      }

      console.log(`📥 Downloading ${file}...`);
      try {
        await downloadFile(url, destPath);
        console.log(`✅ Downloaded ${file}\n`);
      } catch (error) {
        console.error(`❌ Failed to download ${file}:`, error.message);
        // Try onnx quantized version if safetensors fails
        if (file === 'model.safetensors') {
          console.log(`   Trying ONNX quantized version instead...`);
          try {
            await mkdir(join(MODEL_DIR, 'onnx'), { recursive: true });
            const onnxUrl = `${BASE_URL}/onnx/model_quantized.onnx`;
            const onnxPath = join(MODEL_DIR, 'onnx', 'model_quantized.onnx');
            await downloadFile(onnxUrl, onnxPath);
            console.log(`✅ Downloaded ONNX model\n`);
          } catch (onnxError) {
            console.error(`❌ ONNX download also failed:`, onnxError.message);
          }
        }
      }
    }

    console.log('✅ Nomic-embed-text model download complete!\n');
    console.log(`Total model size: ~274MB (quantized)`);

  } catch (error) {
    console.error('❌ Download failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
