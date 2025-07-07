#!/usr/bin/env bash
set -e

# Install dependencies inside frontend
npm ci --quiet --prefix frontend

# Build the React SPA
npm run build --prefix frontend 