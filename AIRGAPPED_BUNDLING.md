# Airgapped Installation - Bundled AI Models

## Overview

Memorizer is now fully airgapped - no internet connection required after `npm install`. All AI models are pre-bundled in the repository and npm package.

## What Was Done

### 1. AI Models Bundled (~1.16GB)

**Embedding Model**: nomic-embed-text v1.5
- Model file: `model.safetensors` (522MB)
- Config files: `config.json`, `tokenizer.json`, `tokenizer_config.json`, `special_tokens_map.json`
- Dimensions: 768D embeddings
- Format: SafeTensors (INT8 quantized)
- Location: `packages/server/models/nomic-embed-text/`

**LLM Model**: TinyLlama 1.1B Chat
- Model file: `model.gguf` (638MB)
- Quantization: Q4_K_M
- Purpose: Automatic title generation
- Location: `packages/server/models/tinyllama-1.1b/`

### 2. Git LFS Configuration

Created `.gitattributes` to track large model files:
```
*.gguf filter=lfs diff=lfs merge=lfs -text
*.safetensors filter=lfs diff=lfs merge=lfs -text
*.onnx filter=lfs diff=lfs merge=lfs -text
*.pkl filter=lfs diff=lfs merge=lfs -text
*.bin filter=lfs diff=lfs merge=lfs -text
*.pth filter=lfs diff=lfs merge=lfs -text
*.h5 filter=lfs diff=lfs merge=lfs -text
```

### 3. Installation Script Updates

**Created**: `packages/server/scripts/postinstall-bundled.js`
- Copies pre-bundled models from package to user's `~/.memorizer/models/` directory
- No internet connection required
- Skips copying if models already exist
- Creates necessary directories automatically

**Updated**: `packages/server/package.json`
```json
{
  "files": [
    "dist",
    "models",  // ← Added
    "scripts/postinstall-bundled.js",  // ← Added
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "postinstall": "node scripts/postinstall-bundled.js"  // ← Changed
  }
}
```

### 4. GitHub Actions Updates

**CI Workflow** (`.github/workflows/ci.yml`):
```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    lfs: true  # ← Enable LFS

- name: Checkout Git LFS files
  run: git lfs pull  # ← Pull LFS files
```

**Publish Workflow** (`.github/workflows/publish.yml`):
- Same LFS checkout configuration
- Ensures models are included in published npm package

### 5. Repository Changes

**Updated**: `.gitignore`
- Removed `models/` from ignore list
- Added comment explaining bundled models should be committed

**Commits**:
1. `b1e422a` - Bundle AI models for airgapped installation
2. `305cb81` - Update .gitattributes with specific path patterns
3. `ae8ad42` - Add Git LFS support to GitHub Actions workflows

## Package Size

| Component | Size | Notes |
|-----------|------|-------|
| Server code (dist) | ~1MB | Minified TypeScript output |
| Web UI (bundled) | ~500KB | Vite optimized bundle |
| nomic-embed-text | ~523MB | SafeTensors + config |
| TinyLlama 1.1B | ~638MB | GGUF Q4_K_M quantized |
| **Total package** | **~1.3GB** | Fully self-contained |

## Installation

### Online Installation (First Time)
```bash
npm install @leon4s4/memorizer-server
```

When you run `npm install`, the postinstall script will:
1. Copy models from `node_modules/@leon4s4/memorizer-server/models/` to `~/.memorizer/models/`
2. Create necessary directories
3. Complete in seconds (no downloads)

### Offline/Airgapped Installation

1. **On a machine with internet**, download the package:
   ```bash
   npm pack @leon4s4/memorizer-server
   ```
   This creates `leon4s4-memorizer-server-2.0.0.tgz` (~1.3GB)

2. **Transfer the .tgz file** to the airgapped machine

3. **On the airgapped machine**, install:
   ```bash
   npm install ./leon4s4-memorizer-server-2.0.0.tgz
   ```

4. **Run Memorizer**:
   ```bash
   npx memorizer start    # HTTP server + Web UI
   npx memorizer mcp      # MCP server for Claude
   ```

## Testing Airgapped Installation

To verify everything works without internet:

1. Disconnect from network
2. Clear npm cache: `npm cache clean --force`
3. Remove existing models: `rm -rf ~/.memorizer/models/`
4. Install package: `npm install @leon4s4/memorizer-server`
5. Start server: `npx memorizer start`

If successful, you'll see:
```
✅ Embedding model loaded: nomic-embed-text (768D)
✅ LLM model loaded: TinyLlama 1.1B
🚀 Memorizer server running on http://localhost:5000
```

## Problem Solved

This fixes the airgapped Windows installation issue where packages like `sharp` and native modules tried to download binaries from GitHub and failed with certificate errors.

**Before**:
- Models downloaded from HuggingFace on first run
- Native modules downloaded during install
- Required internet connection
- Failed on airgapped machines

**After**:
- Everything pre-bundled in npm package
- No internet connection required
- Works on completely isolated machines
- Single `.tgz` file contains everything

## Git LFS Storage

Models are stored in Git LFS, not in the regular Git repository:
- Repository size: ~10MB (code + LFS pointers)
- LFS storage: ~1.16GB (actual model files)
- Clone time: Fast (only pointers downloaded)
- Checkout time: Slower first time (LFS pulls models)

## Future Considerations

### Optional Online Mode
If we want to support both bundled and download modes:

1. Keep `postinstall.js` for online mode (downloads from HuggingFace)
2. Keep `postinstall-bundled.js` for offline mode
3. Publish two packages:
   - `@leon4s4/memorizer-server` (bundled, 1.3GB)
   - `@leon4s4/memorizer-server-lite` (lite, 10MB, downloads on first run)

### Model Updates
To update models in future releases:
1. Download new model files
2. Replace files in `packages/server/models/`
3. Commit with Git LFS: `git add packages/server/models/ && git commit`
4. Models automatically tracked by LFS via `.gitattributes`

## References

- Git LFS Documentation: https://git-lfs.com/
- npm pack Documentation: https://docs.npmjs.com/cli/v10/commands/npm-pack
- HuggingFace nomic-embed-text: https://huggingface.co/nomic-ai/nomic-embed-text-v1.5
- TinyLlama: https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF
