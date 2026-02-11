.PHONY: all build test clean

all: x.feed.tapestry instagram.feed.tapestry

x.feed.tapestry: x.feed/plugin.js x.feed/plugin-config.json
	echo "Building x.feed connector..."
	rm -f x.feed.tapestry
	cd x.feed && zip -r -0 ../x.feed.tapestry . -x "*.DS_Store" -x "__MACOSX/*"
	echo "Created: x.feed.tapestry"

instagram.feed.tapestry: instagram.feed/plugin.js instagram.feed/plugin-config.json
	echo "Building instagram.feed connector..."
	rm -f instagram.feed.tapestry
	cd instagram.feed && zip -r -0 ../instagram.feed.tapestry . -x "*.DS_Store" -x "__MACOSX/*"
	echo "Created: instagram.feed.tapestry"

build: x.feed.tapestry instagram.feed.tapestry

test:
	npm test

clean:
	rm -f x.feed.tapestry instagram.feed.tapestry
