# Airgapped Installation Guide

This document explains how Memorizer TypeScript v2.1.7+ is configured for airgapped (offline) installations.

## The Problem

When installing `npm install -g ./leon4s4-memorizer-server-2.1.7.tgz`, you may encounter errors like:

```
npm error sharp: Downloading https://github.com/lovell/sharp-libvips/...
npm error: Installation error: unable to get local issuer cert
```

This happens because:

1. **`@xenova/transformers`** (embedding model) depends on **`sharp`** (image library)
2. **`sharp` tries to download pre-built binaries** at npm install time
3. **On airgapped/offline machines**, this download fails, blocking the installation

## The Solution

### Step 1: Preinstall Hook (Automatic)

When npm runs, it executes the **preinstall script** (`packages/server/scripts/setup-offline-install.cjs`):

```javascript
// This script runs BEFORE npm installs dependencies
// It configures sharp to NOT download binaries from the internet
```

**Actions:**
- Detects your platform (Windows x64, macOS, Linux)
- Creates/updates `.npmrc` with offline configuration
- Configures sharp to use bundled prebuilds if available

### Step 2: Offline Configuration (.npmrc)

The `.npmrc` file (checked into the repo) contains:

```properties
# Block sharp from attempting remote downloads
sharp_binary_host=https://localhost:1/noop
sharp_libvips_binary_host=https://localhost:1/noop
sharp_libvips_version=0.0.0

# Use bundled prebuilds for Windows x64
sharp_libvips_local_prebuilds=./prebuilds/win32-x64
sharp_local_prebuilds=./prebuilds/win32-x64
```

**Result:** Sharp skips binary download and uses bundled Windows x64 binaries instead.

### Step 3: Postinstall Hook (Model Setup)

After npm installs dependencies, the **postinstall script** (`packages/server/scripts/postinstall-bundled.js`) runs:

```bash
# Verify sharp offline configuration
# Copy bundled AI models to user directory
# Create data directory structure
```

**For bundled package** (~1.2GB):
- Models already included in package
- Script copies them to `~/.memorizer/models/`

**For minimal package** (~10MB):
- Models will download on first use (requires internet once)
- Uses Transformers.js auto-caching mechanism

## Installation Steps

### Windows x64 (Recommended - Fully Airgapped)

```bash
# 1. Download the bundled package (~1.2GB)
curl -o leon4s4-memorizer-server-2.1.7.tgz \
  https://github.com/Leon4s4/memorizer-ts/releases/download/v2.1.7/leon4s4-memorizer-server-2.1.7.tgz

# 2. Transfer to airgapped machine (USB, etc.)

# 3. Install globally (NO internet required)
npm install -g ./leon4s4-memorizer-server-2.1.7.tgz

# 4. Run
memorizer start

# ✅ Works completely offline!
```

### macOS/Linux (With Internet)

```bash
# 1. Install globally
npm install -g ./leon4s4-memorizer-server-2.1.7.tgz

# 2. First run will download models (~900MB)
memorizer start

# ✅ Subsequent runs are fully offline
```

## What Gets Bundled?

### In the Package

```
packages/server/
├── models/
│   ├── nomic-embed-text/        (~274MB - quantized)
│   └── tinyllama-1.1b/          (~637MB - Q4_K_M)
├── prebuilds/
│   └── win32-x64/
│       └── libvips-8.14.5-win32-x64.tar.br  (~7.7MB)
├── scripts/
│   ├── setup-offline-install.cjs     (Preinstall hook)
│   └── postinstall-bundled.js        (Postinstall hook)
└── .npmrc                             (Sharp offline config)
```

**Total Size:** ~1.2GB (compressed: ~900MB)

### What Sharp Does

**Without offline config:**
```
npm install
  → sharp tries to download libvips from GitHub
  → ❌ FAILS on airgapped machine
```

**With offline config:**
```
npm install
  → .npmrc blocks remote downloads
  → sharp uses ./prebuilds/win32-x64/libvips-*.tar.br
  → ✅ Extracts from bundled archive
  → Installation succeeds!
```

## Platform Support

| Platform | Status | Details |
|----------|--------|---------|
| **Windows x64** | ✅ Fully Airgapped | Prebuilds included in package |
| **macOS x64** | 🟡 First-Run Download | Models download on first use |
| **macOS ARM64** | 🟡 First-Run Download | Models download on first use |
| **Linux x64** | 🟡 First-Run Download | Models download on first use |
| **Other** | ⚠️ Requires Internet | Must download all binaries |

## Troubleshooting

### Error: "unable to get local issuer cert"

**Cause:** Sharp still trying to download binaries

**Solution:**
```bash
# Manually set environment variables and retry
export npm_config_sharp_binary_host="https://localhost:1/noop"
export npm_config_sharp_libvips_binary_host="https://localhost:1/noop"

npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
```

### Error: "Models not found"

**Cause:** Running bundled package on non-Windows platform

**Solution:**
- First run requires internet to download models (~900MB)
- Or manually download models and place in `~/.memorizer/models/`

### Sharp extraction failed

**Cause:** Missing `libvips` dependencies on Linux

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get install libvips-dev libvips42

# macOS
brew install vips
```

## How It Works: Deep Dive

### 1. npm Lifecycle

```
npm install
├── preinstall script       (setup-offline-install.cjs)
│   ├── Detect platform
│   ├── Update .npmrc
│   └── Set sharp config
├── Install dependencies    (npm install)
│   ├── Sharp reads .npmrc
│   ├── Sees sharp_binary_host=https://localhost:1/noop
│   └── Uses local prebuilds instead
└── postinstall script      (postinstall-bundled.js)
    ├── Verify sharp config
    ├── Copy models to user dir
    └── Create .memorizer/ structure
```

### 2. Sharp Configuration

**Standard npm config locations:**
- `.npmrc` (project level) ← We use this
- `~/.npmrc` (user level)
- `/etc/npmrc` (global level)

**Sharp-specific settings:**
```properties
sharp_binary_host         # URL for npm binary downloads
sharp_libvips_binary_host # URL for libvips binary downloads
sharp_libvips_version     # Override libvips version
sharp_ignore_global_libvips # Don't use system libvips
sharp_libvips_local_prebuilds  # Path to prebuilds
```

**Our config:**
```properties
sharp_binary_host=https://localhost:1/noop
↑ Block remote URL (localhost:1 fails)

sharp_libvips_local_prebuilds=./prebuilds/win32-x64
↑ Use bundled archive instead
```

### 3. Model Management

**On Bundled Installation:**
```
User runs: npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
           ↓
Postinstall hook detects bundled models
           ↓
Copies to ~/.memorizer/models/
           ↓
memorizer start → Models already available ✅
```

**On Minimal Installation (if downloading models):**
```
User runs: npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
           ↓
Models not bundled, will download on first use
           ↓
User runs: memorizer start (needs internet)
           ↓
EmbeddingService calls transformers.js
           ↓
Transformers.js downloads nomic-embed-text
           ↓
Models cached at ~/.memorizer/models/
           ↓
Subsequent runs: Fully offline ✅
```

## Best Practices

### For End Users (Airgapped Machines)

1. **Download bundled package on internet-connected machine**
   ```bash
   npm pack ./memorizer-ts/packages/server
   ```

2. **Transfer via USB/network to airgapped machine**

3. **Install globally (NO internet required)**
   ```bash
   npm install -g ./leon4s4-memorizer-server-2.1.7.tgz --no-save
   ```

4. **Run**
   ```bash
   memorizer start
   ```

### For Developers

1. **When modifying installation scripts:**
   - Update `setup-offline-install.cjs` (preinstall)
   - Update `postinstall-bundled.js` (postinstall)
   - Update `.npmrc` if sharp config changes

2. **When bundling new release:**
   ```bash
   npm run build
   npm pack
   ```

3. **Test on airgapped Windows machine before release**

4. **Verify no internet calls during `npm install -g`**

## See Also

- `SOLUTION.md` - Architecture decisions (why Transformers.js)
- `SECURITY_AUDIT.md` - Security considerations
- `.npmrc` - Sharp configuration
- `scripts/setup-offline-install.cjs` - Preinstall hook source
- `scripts/postinstall-bundled.js` - Postinstall hook source

---

**Last Updated:** December 2025 | **Version:** 2.1.7
