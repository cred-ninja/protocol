# Makefile for building the Internet-Draft
#
#   make        -> build .txt and .html from the kramdown-rfc source
#   make xml    -> build the xml2rfc v3 .xml (the canonical submission artifact)
#   make clean  -> remove generated artifacts
#
# Requires kramdown-rfc (Ruby >= 3.2) and xml2rfc. Override the tool paths on
# the command line if your install differs, e.g.:
#   make KRAMDOWN_RFC=kramdown-rfc XML2RFC=xml2rfc

DRAFT := draft-sweeney-wimse-credential-delegation-00

# Toolchain locations (discovered on this machine; override as needed).
RUBY_BIN     ?= /opt/homebrew/opt/ruby/bin
KRAMDOWN_RFC ?= /opt/homebrew/lib/ruby/gems/4.0.0/bin/kramdown-rfc
XML2RFC      ?= $(CURDIR)/.venv/bin/xml2rfc

# Ensure kramdown-rfc's shebang resolves to modern Ruby, not system Ruby 2.6.
export PATH := $(RUBY_BIN):$(PATH)

.PHONY: all xml txt html clean
.DELETE_ON_ERROR:

all: txt html

xml:  $(DRAFT).xml
txt:  $(DRAFT).txt
html: $(DRAFT).html

$(DRAFT).xml: $(DRAFT).md
	$(KRAMDOWN_RFC) $< > $@

$(DRAFT).txt: $(DRAFT).xml
	$(XML2RFC) --text $< -o $@

$(DRAFT).html: $(DRAFT).xml
	$(XML2RFC) --html $< -o $@

clean:
	rm -f $(DRAFT).xml $(DRAFT).txt $(DRAFT).html
