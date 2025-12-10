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
const { existsSync } = require('fs');
const os = require('os');

// Determine platform and architecture
const platform = os.platform(); // 'win32', 'darwin', 'linux'
const arch = os.arch(); // 'x64', 'arm64', etc.

console.log(`\n🔧 Memorizer offline installation setup`);
console.log(`Platform: ${platform}-${arch}`);

// Path to bundled prebuilds
const prebuildsDir = join(__dirname, '..', 'prebuilds', `${platform}-${arch}`);

if (existsSync(prebuildsDir)) {
  console.log(`✓ Found bundled binaries at: ${prebuildsDir}`);

  // Set environment variables for sharp
  // These tell sharp to use our bundled binaries instead of downloading
  process.env.npm_config_sharp_libvips_local_prebuilds = prebuildsDir;
  process.env.npm_config_sharp_local_prebuilds = prebuildsDir;
  process.env.SHARP_IGNORE_GLOBAL_LIBVIPS = '1';

  // Write to npmrc to persist these settings during install
  const npmrcContent = `
# Offline installation settings for sharp
sharp_libvips_local_prebuilds=${prebuildsDir}
sharp_local_prebuilds=${prebuildsDir}
sharp_ignore_global_libvips=1
`;

  const { writeFileSync } = require('fs');
  const npmrcPath = join(__dirname, '..', '.npmrc');

  try {
    writeFileSync(npmrcPath, npmrcContent, 'utf8');
    console.log(`✓ Created .npmrc with offline settings`);
  } catch (error) {
    console.warn(`⚠️  Could not write .npmrc:`, error.message);
    console.log(`⚠️  Sharp may attempt to download binaries`);
  }

  console.log(`✅ Offline installation configured\n`);
} else {
  console.log(`⚠️  No bundled binaries found for ${platform}-${arch}`);
  console.log(`   Sharp will attempt to download binaries during installation`);
  console.log(`   (This requires internet connectivity)\n`);
}
