#!/bin/sh
# Start script for Docker - sets NODE_ENV=development to trigger server startup
export NODE_ENV=development
exec node dist/src/main.js

