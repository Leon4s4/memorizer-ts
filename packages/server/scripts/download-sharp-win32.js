/**
 * Download sharp Windows x64 binaries for offline installation
 *
 * This script downloads the prebuilt binaries needed for sharp on Windows x64
 * so they can be bundled with the package for airgapped installation.
 */

import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';
import { get } from 'https';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PREBUILDS_DIR = join(__dirname, '..', 'prebuilds', 'win32-x64');

// Sharp version and platform info
const SHARP_VERSION = '0.32.6';
const LIBVIPS_VERSION = '8.14.5';
const PLATFORM = 'win32';
const ARCH = 'x64';

const downloads = [
  {
    name: 'libvips',
    url: `https://github.com/lovell/sharp-libvips/releases/download/v${LIBVIPS_VERSION}/libvips-${LIBVIPS_VERSION}-${PLATFORM}-${ARCH}.tar.br`,
    filename: `libvips-${LIBVIPS_VERSION}-${PLATFORM}-${ARCH}.tar.br`
  }
];

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`);
    console.log(`To: ${dest}`);

    const file = createWriteStream(dest);

    get(url, (response) => {
      // Follow redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        file.close();
        return downloadFile(response.headers.location, dest)
          .then(resolve)
          .catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`✓ Downloaded: ${dest}`);
        resolve();
      });

      file.on('error', (err) => {
        file.close();
        reject(err);
      });
    }).on('error', (err) => {
      file.close();
      reject(err);
    });
  });
}

async function main() {
  console.log('Downloading sharp Windows x64 binaries...\n');

  // Create prebuilds directory
  await mkdir(PREBUILDS_DIR, { recursive: true });

  // Download each binary
  for (const download of downloads) {
    const dest = join(PREBUILDS_DIR, download.filename);
    try {
      await downloadFile(download.url, dest);
    } catch (error) {
      console.error(`Failed to download ${download.name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✅ All binaries downloaded successfully!');
  console.log(`Location: ${PREBUILDS_DIR}`);
}

main().catch(console.error);
