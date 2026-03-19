#!/usr/bin/env bash
# ============================================================
# setup.sh — Local development setup helper
# Run once after cloning: bash scripts/setup.sh
# ============================================================

set -e

echo "→ Checking Node.js version..."
node_version=$(node -v 2>/dev/null || echo "not found")
if [ "$node_version" = "not found" ]; then
  echo "ERROR: Node.js is not installed. Install Node.js >= 18 and try again."
  exit 1
fi
echo "  Node.js $node_version found."

echo "→ Installing dependencies..."
npm install

echo "→ Setting up .env file..."
if [ -f ".env" ]; then
  echo "  .env already exists — skipping."
else
  cp .env.example .env
  echo "  .env created from .env.example"
  echo "  ACTION REQUIRED: Open .env and fill in your local values."
fi

echo ""
echo "✓ Setup complete."
echo ""
echo "Next steps:"
echo "  1. Edit .env with your local database and config values."
echo "  2. Run: npm run dev"
echo ""
