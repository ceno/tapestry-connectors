# Auto-discover connector directories (contain plugin.js + plugin-config.json, exclude examples/)
CONNECTORS := $(sort $(patsubst %/plugin.js,%,$(filter-out examples/%,$(wildcard */plugin.js))))
TAPESTRY_FILES := $(addsuffix .tapestry,$(CONNECTORS))

.PHONY: all build test clean list

all: $(TAPESTRY_FILES)

# Generic rule: build any <name>.tapestry from its <name>/ directory
%.tapestry: %/plugin.js %/plugin-config.json
	@echo "Building $* connector..."
	@rm -f $@
	cd $* && zip -r -0 ../$@ . -x "*.DS_Store" -x "__MACOSX/*"
	@echo "Created: $@"

build: $(TAPESTRY_FILES)

test:
	npm test

clean:
	rm -f $(TAPESTRY_FILES)

# Utility: show which connectors were discovered
list:
	@echo "Discovered connectors: $(CONNECTORS)"
	@echo "Will build: $(TAPESTRY_FILES)"
