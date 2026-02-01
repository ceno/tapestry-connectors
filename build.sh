#!/bin/bash
#
# Build script for Tapestry connectors
# Creates a .tapestry file (zip archive) from a connector directory
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

usage() {
    echo "Usage: $0 <connector-directory>"
    echo ""
    echo "Examples:"
    echo "  $0 x.feed"
    echo "  $0 org.joinmastodon.account"
    echo "  $0 social.bsky.account"
    echo ""
    echo "This will create a .tapestry file in the current directory."
    exit 1
}

[ -z "$1" ] && usage

CONNECTOR_DIR="${1%/}"
CONNECTOR_PATH="$SCRIPT_DIR/$CONNECTOR_DIR"

if [ ! -d "$CONNECTOR_PATH" ]; then
    echo "Error: Directory '$CONNECTOR_DIR' not found in $SCRIPT_DIR"
    exit 1
fi

for file in plugin.js plugin-config.json; do
    if [ ! -f "$CONNECTOR_PATH/$file" ]; then
        echo "Error: $file not found in $CONNECTOR_DIR"
        exit 1
    fi
done

OUTPUT_FILE="$CONNECTOR_DIR.tapestry"

rm -f "$OUTPUT_FILE"

cd "$CONNECTOR_PATH"
zip -r -0 "$SCRIPT_DIR/$OUTPUT_FILE" . -x "*.DS_Store" -x "__MACOSX/*"

echo ""
echo "Created: $OUTPUT_FILE"
