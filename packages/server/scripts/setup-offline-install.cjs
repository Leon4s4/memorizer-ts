/**
 * Setup script for offline/airgapped installation
 *
 * This script runs BEFORE npm installs dependencies (preinstall hook).
 * It sets environment variables to prevent sharp from downloading binaries.
 *
 * CRITICAL: This must set process.env variables, not just write .npmrc,
 * because npm has already read .npmrc before preinstall runs.
 */

const { join } = require('path');
const { existsSync, writeFileSync } = require('fs');
const os = require('os');

// Determine platform and architecture
const platform = os.platform(); // 'win32', 'darwin', 'linux'
const arch = os.arch(); // 'x64', 'arm64', etc.

console.log(`\n🔧 Memorizer offline installation setup`);
console.log(`Platform: ${platform}-${arch}`);

// Path to bundled prebuilds
const prebuildsDir = join(__dirname, '..', 'prebuilds', `${platform}-${arch}`);

// CRITICAL: Set environment variables to block sharp downloads
// These take precedence over .npmrc
process.env.npm_config_sharp_binary_host = 'https://localhost:1/noop';
process.env.npm_config_sharp_libvips_binary_host = 'https://localhost:1/noop';
process.env.npm_config_sharp_libvips_version = '0.0.0';
process.env.npm_config_sharp_ignore_global_libvips = '1';

console.log(`✓ Blocked sharp binary downloads via environment variables`);

if (existsSync(prebuildsDir)) {
  // Point sharp to bundled prebuilds
  process.env.npm_config_sharp_libvips_local_prebuilds = prebuildsDir;
  process.env.npm_config_sharp_local_prebuilds = prebuildsDir;
  
  console.log(`✓ Found bundled binaries at: ${prebuildsDir}`);
  console.log(`✓ Sharp will use local prebuilds (no download)`);
} else {
  console.log(`⚠️  No bundled prebuilds found for ${platform}-${arch}`);
  console.log(`   Only Windows x64 prebuilds are included`);
  console.log(`   Sharp will be blocked from downloading (offline mode active)`);
}

// Also update .npmrc for documentation purposes
const npmrcPath = join(__dirname, '..', '.npmrc');
const npmrcContent = `# Offline installation settings - prevents sharp binary downloads
# This ensures airgapped installations work without internet

# Block sharp from downloading binaries from GitHub/npm
sharp_binary_host=https://localhost:1/noop
sharp_libvips_binary_host=https://localhost:1/noop
sharp_libvips_version=0.0.0
sharp_ignore_global_libvips=1

# If bundled prebuilds exist, configure their location
${existsSync(prebuildsDir) ? `sharp_libvips_local_prebuilds=${prebuildsDir}
sharp_local_prebuilds=${prebuildsDir}` : '# No bundled prebuilds found for this platform'}
`;

try {
  writeFileSync(npmrcPath, npmrcContent, 'utf8');
  console.log(`✓ Updated .npmrc with offline configuration`);
} catch (error) {
  console.warn(`⚠️  Could not write .npmrc: ${error.message}`);
}

console.log(`✅ Offline installation setup complete\n`);
