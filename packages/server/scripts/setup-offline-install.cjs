/**
 * Setup script for offline/airgapped installation
 *
 * This script runs BEFORE npm installs dependencies (preinstall hook).
 * It sets environment variables to point sharp to the bundled Windows x64 binaries,
 * preventing it from trying to download binaries from the internet.
 *
 * Key environment variables for sharp:
 * - npm_config_sharp_libvips_local_prebuilds: Path to bundled libvips binary
 * - SHARP_IGNORE_GLOBAL_LIBVIPS: Prevents looking for system libvips
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
const npmrcPath = join(__dirname, '..', '.npmrc');

// Always configure offline mode to block remote downloads
const npmrcContent = `# Offline installation settings - prevents sharp binary downloads
# This ensures airgapped installations work without internet

# Block sharp from downloading binaries from GitHub/npm
sharp_binary_host=https://localhost:1/noop
sharp_libvips_binary_host=https://localhost:1/noop
sharp_libvips_version=0.0.0

# If bundled prebuilds exist, configure their location
${existsSync(prebuildsDir) ? `sharp_libvips_local_prebuilds=${prebuildsDir}
sharp_local_prebuilds=${prebuildsDir}
sharp_ignore_global_libvips=1` : '# No bundled prebuilds found for this platform'}
`;

try {
  writeFileSync(npmrcPath, npmrcContent, 'utf8');
  console.log(`✓ Created .npmrc with offline configuration`);
  
  if (existsSync(prebuildsDir)) {
    console.log(`✓ Found bundled binaries at: ${prebuildsDir}`);
    console.log(`✓ Sharp will use local prebuilds (no download)`);
  } else {
    console.log(`⚠️  No bundled prebuilds found for ${platform}-${arch}`);
    console.log(`   Only Windows x64 prebuilds are included`);
    console.log(`   Sharp will be blocked from downloading (offline mode active)`);
  }
} catch (error) {
  console.error(`❌ Could not configure .npmrc:`, error.message);
  console.error(`   Installation may fail if sharp tries to download binaries`);
}

console.log(`✅ Offline installation setup complete\n`);
