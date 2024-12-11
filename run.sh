#!/bin/bash
# This script runs node app.js in the current directory

# Get the current directory
CURRENT_DIR=$(pwd)

# Run the Node.js application
cd "$CURRENT_DIR" || exit
node app.js