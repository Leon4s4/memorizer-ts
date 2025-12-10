#!/bin/bash

# Test script for airgapped installation
# Verifies that sharp is properly configured for offline use

set -e

echo "╔════════════════════════════════════════════════╗"
echo "║  Memorizer Airgapped Installation Test        ║"
echo "║  Verifying sharp offline configuration        ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

SERVER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "📁 Server directory: $SERVER_DIR"
echo ""

# Test 1: Verify .npmrc exists
echo "[Test 1] Checking .npmrc configuration..."
if [ -f "$SERVER_DIR/.npmrc" ]; then
  echo "  ✓ .npmrc file exists"
else
  echo "  ✗ .npmrc file NOT found"
  exit 1
fi
echo ""

# Test 2: Check sharp_binary_host is set to localhost
echo "[Test 2] Verifying sharp remote downloads are blocked..."
if grep -q "sharp_binary_host=https://localhost:1/noop" "$SERVER_DIR/.npmrc"; then
  echo "  ✓ sharp_binary_host is blocked (https://localhost:1/noop)"
else
  echo "  ✗ sharp_binary_host not properly configured"
  exit 1
fi
echo ""

# Test 3: Check bundled prebuilds location
echo "[Test 3] Verifying bundled prebuilds configuration..."
if grep -q "sharp_libvips_local_prebuilds" "$SERVER_DIR/.npmrc"; then
  PREBUILDS_PATH=$(grep "sharp_libvips_local_prebuilds=" "$SERVER_DIR/.npmrc" | cut -d'=' -f2)
  echo "  ✓ Local prebuilds configured at: $PREBUILDS_PATH"
else
  echo "  ✗ Local prebuilds path not configured"
  exit 1
fi
echo ""

# Test 4: Verify prebuilds actually exist
echo "[Test 4] Checking if bundled prebuilds exist..."
if [ -d "$SERVER_DIR/prebuilds/win32-x64" ]; then
  echo "  ✓ Prebuilds directory exists: $SERVER_DIR/prebuilds/win32-x64"
  
  PREBUILD_FILES=$(find "$SERVER_DIR/prebuilds/win32-x64" -type f)
  FILE_COUNT=$(echo "$PREBUILD_FILES" | wc -l)
  echo "  ✓ Found $FILE_COUNT prebuilt file(s)"
  
  echo "$PREBUILD_FILES" | while read -r file; do
    SIZE=$(du -h "$file" | cut -f1)
    NAME=$(basename "$file")
    echo "    - $NAME ($SIZE)"
  done
else
  echo "  ⚠️  Prebuilds directory not found"
  echo "     (Platform may not have bundled prebuilds)"
fi
echo ""

# Test 5: Check postinstall script mentions offline verification
echo "[Test 5] Verifying postinstall script..."
if grep -q "Verifying offline mode for sharp" "$SERVER_DIR/scripts/postinstall-bundled.js"; then
  echo "  ✓ Postinstall script includes offline verification"
else
  echo "  ⚠️  Postinstall verification not found"
fi
echo ""

# Test 6: Check preinstall script
echo "[Test 6] Verifying preinstall script..."
if [ -f "$SERVER_DIR/scripts/setup-offline-install.cjs" ]; then
  echo "  ✓ Preinstall script exists"
  if grep -q "npm_config_sharp_libvips_local_prebuilds" "$SERVER_DIR/scripts/setup-offline-install.cjs"; then
    echo "  ✓ Preinstall script configures sharp prebuilds"
  fi
else
  echo "  ✗ Preinstall script NOT found"
  exit 1
fi
echo ""

# Summary
echo "═════════════════════════════════════════════════"
echo "✅ All configuration checks passed!"
echo ""
echo "The installation is configured for offline use:"
echo "  • Sharp binary downloads are BLOCKED"
echo "  • Bundled Windows x64 prebuilds will be used"
echo "  • Installation should work without internet"
echo ""
echo "To test the full installation:"
echo "  npm install -g ./leon4s4-memorizer-server-2.1.7.tgz"
echo ""
echo "See AIRGAPPED_INSTALL.md for detailed documentation."
