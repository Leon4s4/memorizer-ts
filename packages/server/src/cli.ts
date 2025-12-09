#!/usr/bin/env node

/**
 * CLI entry point for Memorizer
 */

import 'reflect-metadata';
import { Command } from 'commander';
import { startServer } from './server.js';
import { loadConfig } from './utils/config.js';
import type { Config } from './utils/config.js';
import { container } from 'tsyringe';
import { McpServer } from './mcp/server.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json for version
let version = '2.0.0';
try {
  const packageJson = JSON.parse(
    readFileSync(join(__dirname, '../package.json'), 'utf-8')
  );
  version = packageJson.version;
} catch (error) {
  // Fallback to hardcoded version
}

const program = new Command();

program
  .name('memorizer')
  .description('Airgapped AI memory service with embedded models')
  .version(version);

// Start command
program
  .command('start')
  .description('Start the Memorizer server')
  .option('-p, --port <port>', 'Port to listen on', '5000')
  .option('-d, --data <path>', 'Data directory path')
  .option('-m, --models <path>', 'Models directory path')
  .option('--no-ui', 'Disable web UI')
  .option('--log-level <level>', 'Log level (debug, info, warn, error)', 'info')
  .action(async (options) => {
    try {
      const configOverrides: Partial<Config> = {};

      if (options.port) {
        configOverrides.port = parseInt(options.port);
      }

      if (options.data) {
        configOverrides.dataPath = options.data;
      }

      if (options.models) {
        configOverrides.modelPath = options.models;
      }

      if (options.ui === false) {
        configOverrides.enableUI = false;
      }

      if (options.logLevel) {
        configOverrides.logLevel = options.logLevel as Config['logLevel'];
      }

      const config = loadConfig(configOverrides);

      await startServer(config);
    } catch (error) {
      console.error('Failed to start server:', error);
      process.exit(1);
    }
  });

// Export command (Phase 1 - placeholder)
program
  .command('export')
  .description('Export all memories to JSON')
  .option('-o, --output <path>', 'Output file path', 'memories.json')
  .action(async (options) => {
    console.log('Export command not yet implemented');
    console.log('This will be available in Phase 3');
    process.exit(1);
  });

// Import command (Phase 1 - placeholder)
program
  .command('import')
  .description('Import memories from JSON')
  .option('-i, --input <path>', 'Input file path', 'memories.json')
  .action(async (options) => {
    console.log('Import command not yet implemented');
    console.log('This will be available in Phase 3');
    process.exit(1);
  });

// Backup command (Phase 1 - placeholder)
program
  .command('backup')
  .description('Backup all data to archive')
  .option('-o, --output <path>', 'Backup file path', 'backup.zip')
  .action(async (options) => {
    console.log('Backup command not yet implemented');
    console.log('This will be available in Phase 3');
    process.exit(1);
  });

// Restore command (Phase 1 - placeholder)
program
  .command('restore')
  .description('Restore data from backup archive')
  .option('-i, --input <path>', 'Backup file path')
  .action(async (options) => {
    console.log('Restore command not yet implemented');
    console.log('This will be available in Phase 3');
    process.exit(1);
  });

// Admin commands
const admin = program.command('admin').description('Administrative operations');

admin
  .command('title-gen')
  .description('Generate missing titles for memories')
  .action(async () => {
    console.log('Title generation command not yet implemented');
    console.log('This will be available in Phase 4');
    process.exit(1);
  });

admin
  .command('rebuild-index')
  .description('Rebuild vector indexes')
  .action(async () => {
    console.log('Rebuild index command not yet implemented');
    console.log('This will be available in Phase 2');
    process.exit(1);
  });

admin
  .command('purge-versions')
  .description('Purge old versions')
  .option('--keep <count>', 'Number of versions to keep per memory', '50')
  .action(async (options) => {
    console.log('Purge versions command not yet implemented');
    console.log('This will be available in Phase 3');
    process.exit(1);
  });

// MCP Server command
program
  .command('mcp')
  .description('Start MCP server (Model Context Protocol)')
  .option('-d, --data <path>', 'Data directory path')
  .option('-m, --models <path>', 'Models directory path')
  .action(async (options) => {
    try {
      const configOverrides: Partial<Config> = {};

      if (options.data) {
        configOverrides.dataPath = options.data;
      }

      if (options.models) {
        configOverrides.modelPath = options.models;
      }

      // Load config but don't start HTTP server
      const config = loadConfig(configOverrides);

      // Initialize services without starting HTTP server
      // This initializes the DI container with storage and other services
      const { initializeServices } = await import('./server.js');
      await initializeServices(config);

      // Start MCP server with stdio transport
      const mcpServer = container.resolve(McpServer);
      await mcpServer.start();

      // MCP server runs indefinitely until killed
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  });

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
