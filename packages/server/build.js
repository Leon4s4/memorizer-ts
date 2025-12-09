/**
 * Build script using esbuild for production bundle
 */

import * as esbuild from 'esbuild';
import { chmod } from 'fs/promises';

async function build() {
  try {
    // Build server
    await esbuild.build({
      entryPoints: ['src/cli.ts', 'src/server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      outdir: 'dist',
      format: 'esm',
      external: [
        // Native modules that shouldn't be bundled
        '@lancedb/lancedb',
        'node-llama-cpp',
        '@xenova/transformers',
        // Fastify and plugins
        'fastify',
        '@fastify/static',
        '@fastify/cors',
        // MCP SDK
        '@modelcontextprotocol/sdk',
        // Other dependencies with native bindings
        'ioredis',
        'bullmq',
        // Logging
        'pino',
        'pino-pretty',
        // Shared package
        '@leon4s4/memorizer-shared',
      ],
      minify: true,
      sourcemap: true,
      banner: {
        js: '#!/usr/bin/env node',
      },
      logLevel: 'info',
    });

    // Make CLI executable
    await chmod('dist/cli.js', 0o755);

    console.log('✅ Build complete!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
