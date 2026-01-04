#!/bin/sh
set -e

echo "=== Starting Application ==="

# Database setup is now handled by the server itself (src/utils/database-setup.js)
# This entrypoint just starts the application

# Start the application
echo "→ Starting server (database setup will run automatically)..."
exec "$@"
