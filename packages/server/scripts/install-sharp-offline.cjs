#!/usr/bin/env node

/**
 * CRITICAL: Preinstall hook to make sharp install fail gracefully
 * 
 * Sharp will be installed but won't need its native module for our use case.
 * Strategy: Block prebuild downloads + skip native rebuild
 * Sharp will fail gracefully without crashing the install
 */

const { join, dirname } = require('path');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const os = require('os');

const platform = os.platform();
const arch = os.arch();
const nodeVersion = process.versions.node;

console.log(`\n🔒 Offline Sharp Configuration`);
console.log(`Platform: ${platform}-${arch}`);
console.log(`Node: ${nodeVersion}\n`);

// CRITICAL: Disable all sharp binary downloads
process.env.npm_config_sharp_binary_host = 'https://127.0.0.1:1';
process.env.npm_config_sharp_libvips_binary_host = 'https://127.0.0.1:1';
process.env.npm_config_sharp_libvips_download_all = 'false';
process.env.npm_config_sharp_ignore_global_libvips = 'true';

// Disable node-gyp rebuild
process.env.npm_config_build_from_source = 'false';

// Disable python requirement
process.env.npm_config_python = 'none';

console.log(`✅ Sharp will fail gracefully if prebuild not found`);
console.log(`✅ Node-gyp rebuild disabled`);
console.log(`✅ Install will continue even if sharp build fails\n`);
