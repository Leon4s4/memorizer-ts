# Quick Reference: Airgapped Installation Fix

## What Was Fixed

**Problem:** `npm install -g ./leon4s4-memorizer-server-2.1.7.tgz` fails with sharp binary download errors on airgapped machines.

**Root Cause:** Sharp (transitive dependency from transformers.js) attempts to download Windows x64 binaries from GitHub during npm install.

**Solution:** Pre-bundle sharp binaries and configure npm to use them instead of downloading.

---

## Files Modified

### 1. `.npmrc` (Configuration)
**Location:** `packages/server/.npmrc`

**Change:** Replaced generic host-blocking with specific sharp configuration that points to bundled prebuilds.

**Before:**
```properties
sharp_binary_host=https://localhost/
sharp_libvips_binary_host=https://localhost/
sharp_libvips_version=false
```

**After:**
```properties
sharp_binary_host=https://localhost:1/noop
sharp_libvips_binary_host=https://localhost:1/noop
sharp_libvips_version=0.0.0
sharp_libvips_local_prebuilds=./prebuilds/win32-x64
sharp_local_prebuilds=./prebuilds/win32-x64
```

**Key differences:**
- `localhost:1/noop` - Unreachable host (fails fast)
- Includes path to bundled prebuilds
- `0.0.0` version prevents version mismatches

---

### 2. `setup-offline-install.cjs` (Preinstall Hook)
**Location:** `packages/server/scripts/setup-offline-install.cjs`

**Change:** Simplified logic to always configure offline mode and properly set prebuilds location.

**Key improvements:**
- Always writes `.npmrc` (not just when prebuilds exist)
- Conditional prebuilds path in `.npmrc` template
- Better error handling and logging
- Clear messaging for each platform

**Flow:**
```
npm install (preinstall runs)
  ↓
Detects platform (win32, darwin, linux)
  ↓
Sets npm config to block remote downloads
  ↓
Configures sharp to use ./prebuilds/win32-x64/
  ↓
npm continues with dependency install
```

---

### 3. `postinstall-bundled.js` (Postinstall Hook)
**Location:** `packages/server/scripts/postinstall-bundled.js`

**Change:** Added verification step to confirm sharp offline configuration was applied.

**New behavior:**
```javascript
// Verify sharp offline configuration
console.log('🔧 Verifying offline mode for sharp...');
const npmrcContent = readFileSync(npmrcPath, 'utf8');
if (npmrcContent.includes('sharp_binary_host=https://localhost:1/noop')) {
  console.log('✓ Sharp is configured for offline mode (no downloads)\n');
}
```

**Benefit:** User gets confirmation that offline mode is active.

---

### 4. `AIRGAPPED_INSTALL.md` (Documentation)
**Location:** `packages/server/AIRGAPPED_INSTALL.md`

**Content:** Comprehensive guide covering:
- Problem explanation
- Solution details
- Installation steps by platform
- Troubleshooting
- How it works (deep dive)
- Best practices

---

## How Sharp Binaries Are Used

### Without Configuration (❌ Fails)
```bash
npm install
  → Sharp detects missing binaries
  → Tries: https://github.com/lovell/sharp-libvips/releases/...
  → ❌ Network error on airgapped machine
  → Installation fails
```

### With Configuration (✅ Works)
```bash
npm install
  → npm reads .npmrc
  → Sees: sharp_libvips_local_prebuilds=./prebuilds/win32-x64
  → Sharp reads: ./prebuilds/win32-x64/libvips-8.14.5-win32-x64.tar.br
  → Extracts bundled binary
  → ✅ Installation succeeds
```

---

## Testing the Fix

### Test 1: Verify Configuration
```bash
cd packages/server
cat .npmrc | grep sharp
# Should show:
# sharp_binary_host=https://localhost:1/noop
# sharp_libvips_local_prebuilds=./prebuilds/win32-x64
```

### Test 2: Verify Prebuilds Exist
```bash
ls -lh packages/server/prebuilds/win32-x64/
# Should show:
# libvips-8.14.5-win32-x64.tar.br (~7.7MB)
```

### Test 3: Test Installation (On Windows)
```bash
npm install -g ./leon4s4-memorizer-server-2.1.7.tgz
# Should complete without network errors
```

### Test 4: Verify Offline Mode Active
```bash
memorizer start
# Look for in logs:
# ✓ Sharp is configured for offline mode (no downloads)
```

---

## Key Technical Details

### Sharp Configuration Precedence
1. Environment variables (highest)
2. `.npmrc` file ← We use this
3. User `~/.npmrc`
4. System `/etc/npmrc`
5. Sharp defaults (lowest)

### Why `localhost:1/noop`?
- `localhost` - can't reach external URLs
- `:1` - invalid port (fails fast)
- `/noop` - clearly non-existent endpoint
- Result: Sharp immediately fails network attempts and falls back to local prebuilds

### Bundled Prebuilds
- **File:** `libvips-8.14.5-win32-x64.tar.br` (7.7MB compressed)
- **Format:** Brotli-compressed tar archive
- **Platform:** Windows x64 only
- **Location:** Checked into repo at `packages/server/prebuilds/`

### macOS/Linux Handling
- Prebuilds not included (platform-specific)
- Sharp will skip download attempt (blocked by config)
- May fall back to system libvips if available
- Or download on first use (requires internet once)

---

## What This Enables

✅ **Fully airgapped installations on Windows x64** - No internet required after package download

✅ **Consistent behavior** - Same installation process works online and offline

✅ **Clear user feedback** - Tells user when offline mode is active

✅ **Future-proof** - Setup script can easily add prebuilds for other platforms

---

## Known Limitations

⚠️ **Prebuilds only for Windows x64** - Other platforms will need system libvips or first-run download

⚠️ **Sharp is unused in code** - It's only needed because transformers.js has it as dependency. Consider Option 2 (ONNX Runtime) for future versions.

⚠️ **macOS/Linux first-run** - Will download models on first use (requires internet once)

---

## Related Issues

- GitHub: [#1021 - Sharp binary downloads block airgapped installs](https://github.com/Leon4s4/memorizer-ts/issues/1021)
- See: `SOLUTION.md` for architecture decision (Transformers.js vs ONNX Runtime)
- See: `SECURITY_AUDIT.md` for sharp vulnerability notes

---

**Implementation Complete:** December 10, 2025
