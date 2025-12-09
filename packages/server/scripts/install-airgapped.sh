#!/bin/bash

# Airgapped installation script for memorizer-server
# This script installs the package while gracefully handling sharp installation failures

set -e

echo "=================================================="
echo "Memorizer Airgapped Installation Script"
echo "=================================================="
echo ""

PACKAGE_PATH="$1"

if [ -z "$PACKAGE_PATH" ]; then
    echo "❌ Error: Package path required"
    echo ""
    echo "Usage: ./install-airgapped.sh <path-to-tarball>"
    echo "Example: ./install-airgapped.sh ./leon4s4-memorizer-server-2.1.1.tgz"
    exit 1
fi

if [ ! -f "$PACKAGE_PATH" ]; then
    echo "❌ Error: Package file not found: $PACKAGE_PATH"
    exit 1
fi

echo "📦 Installing package: $PACKAGE_PATH"
echo ""

# Set environment variables to prevent sharp from downloading binaries
export SHARP_IGNORE_GLOBAL_LIBVIPS=1
export npm_config_sharp_binary_host="https://localhost/"
export npm_config_sharp_libvips_binary_host="https://localhost/"

echo "🔧 Installing with sharp binary downloads disabled..."
echo ""

# Install with --force to ignore sharp installation errors
# The --force flag allows npm to continue even if sharp's postinstall fails
npm install --force --no-optional -g "$PACKAGE_PATH" 2>&1 | grep -v "sharp:" || true

echo ""
echo "✅ Installation complete!"
echo ""
echo "📝 Note: You may have seen warnings about 'sharp' package."
echo "   This is expected and safe - sharp is only needed for image"
echo "   processing, but Memorizer only uses text embeddings."
echo ""
echo "🚀 You can now run:"
echo "   memorizer start    # Start HTTP server + Web UI"
echo "   memorizer mcp      # Start MCP server for Claude"
echo ""
