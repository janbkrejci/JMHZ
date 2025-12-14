#!/bin/bash

# Exit on any error
set -e

echo "Updating ts-form assets from ../TSWebUI..."

# 1. Copy ts-form-bundle.js from ../TSWebUI/dist folder
if [ -f "../TSWebUI/dist/ts-form-bundle.js" ]; then
    cp ../TSWebUI/dist/ts-form-bundle.js .
    echo "✅ Copied ts-form-bundle.js"
else
    echo "⚠️  ../TSWebUI/dist/ts-form-bundle.js not found"
fi

# 2. Copy ts-form-readme.md from ../TSWebUI folder
if [ -f "../TSWebUI/ts-form-readme.md" ]; then
    cp ../TSWebUI/ts-form-readme.md .
    echo "✅ Copied ts-form-readme.md"
else
    echo "⚠️  ../TSWebUI/ts-form-readme.md not found"
fi

# 3. Copy *.js files from ../TSWebUI/packages/ts-form/src into ts-form folder
if [ -d "../TSWebUI/packages/ts-form/src" ]; then
    # Ensure local directory exists
    mkdir -p ts-form
    cp ../TSWebUI/packages/ts-form/src/*.js ts-form/
    echo "✅ Copied source files to ts-form/"
else
    echo "⚠️  ../TSWebUI/packages/ts-form/src directory not found"
fi

echo "Update complete."
