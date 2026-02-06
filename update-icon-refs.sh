#!/bin/bash

# Update icon references from SVG to PNG in all HTML files
for file in *.html; do
    if [ -f "$file" ]; then
        sed -i 's/icon-192x192\.svg/icon-192x192.png/g' "$file"
        echo "✓ Updated $file"
    fi
done

echo ""
echo "✅ All icon references updated to PNG"
