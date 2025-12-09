/**
 * Configuration management for Memorizer
 */

import { homedir } from 'os';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

export interface Config {
  port: number;
  dataPath: string;
  modelPath: string;
  cachePath: string;
  enableUI: boolean;
  corsOrigins: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): Config {
  const homeDir = homedir();
  const memorizerDir = join(homeDir, '.memorizer');

  return {
    port: parseInt(process.env.MEMORIZER_PORT || '5000'),
    dataPath: process.env.MEMORIZER_DATA_PATH || join(memorizerDir, 'data'),
    modelPath: process.env.MEMORIZER_MODEL_PATH || join(memorizerDir, 'models'),
    cachePath: process.env.MEMORIZER_CACHE_PATH || join(memorizerDir, 'cache'),
    enableUI: process.env.MEMORIZER_ENABLE_UI !== 'false',
    corsOrigins: process.env.MEMORIZER_CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
    logLevel: (process.env.MEMORIZER_LOG_LEVEL as Config['logLevel']) || 'info',
  };
}

/**
 * Ensure required directories exist
 */
export function ensureDirectories(config: Config): void {
  const dirs = [config.dataPath, config.modelPath, config.cachePath];

  for (const dir of dirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

/**
 * Load configuration with overrides
 */
export function loadConfig(overrides: Partial<Config> = {}): Config {
  const defaultConfig = getDefaultConfig();
  const config = { ...defaultConfig, ...overrides };

  // Ensure directories exist
  ensureDirectories(config);

  return config;
}
