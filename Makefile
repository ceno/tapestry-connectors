.PHONY: all build test clean

all: build

build: x.feed/plugin.js x.feed/plugin-config.json
	echo "Building x.feed connector..."
	rm -f x.feed.tapestry
	cd x.feed && zip -r -0 ../x.feed.tapestry . -x "*.DS_Store" -x "__MACOSX/*"
	echo "Created: x.feed.tapestry"

test:
	npm test

clean:
	rm -f x.feed.tapestry