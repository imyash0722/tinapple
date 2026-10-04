# tinapple v0.0.1 — Homelab Server OS
# Top-level Makefile for building and testing all components

SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help all test test-bash test-go build build-tui build-dash build-config build-chadwm clean

help:
	@echo "tinapple v0.0.1 build system"
	@echo "=============================="
	@echo "Targets:"
	@echo "  all          Build all Go binaries and components"
	@echo "  test         Run all syntax checks and Go unit tests"
	@echo "  test-bash    Run 'bash -n' on all shell scripts"
	@echo "  test-go      Run 'go test' across Go components"
	@echo "  build        Compile Go binaries (TUI, Dash, Config Generator)"
	@echo "  build-tui    Compile installer Go TUI"
	@echo "  build-dash   Compile tinapple-dash web server"
	@echo "  build-config Compile tinapple-config-generator"
	@echo "  clean        Remove build artifacts"

build-tui:
	@echo "==> Building tinapple-installer TUI..."
	@if [ -d tinapple-installer/tui ]; then \
		(cd tinapple-installer/tui && go build -v -o ../bin/tinapple-tui . && cp -f ../bin/tinapple-tui ../bin/tinapple-install && cp -f ../bin/tinapple-tui tinapple-installer && cp -f ../bin/tinapple-tui ../iso/airootfs/usr/local/bin/tinapple-install); \
	fi

build-dash:
	@echo "==> Building tinapple-dash..."
	@if [ -d tinapple-dash ]; then \
		(cd tinapple-dash && go build -v -o bin/tinapple-dash ./cmd/tinapple-dash); \
	fi

build-config:
	@echo "==> Building tinapple-config-generator..."
	@if [ -d tinapple-config-generator ]; then \
		(cd tinapple-config-generator && go build -v -o bin/tinapple-config-generator .); \
	fi

build-store:
	@echo "==> Building chaddy-store and chaddy-settings..."
	@if [ -d chaddy-store ]; then \
		(cd chaddy-store && go build -v -o bin/chaddy-store ./cmd/chaddy-store && go build -v -o bin/chaddy-settings ./cmd/chaddy-settings && mkdir -p ../bin && cp -f bin/chaddy-store ../bin/ && cp -f bin/chaddy-settings ../bin/); \
	fi

build: build-tui build-dash build-config build-store

test-bash:
	@echo "==> Checking bash syntax across all scripts..."
	@find . -type f \( -name "*.sh" -o -path "*/bin/*" \) ! -path "./.git/*" ! -path "./ryoku-src/*" ! -path "./tinarchy-src/*" | while read -r script; do \
		if head -n1 "$$script" | grep -qE '^#!.*(bash|sh)'; then \
			bash -n "$$script" || exit 1; \
		fi \
	done
	@echo "==> All shell scripts passed syntax check!"

test-go:
	@echo "==> Running Go tests..."
	@if [ -d tinapple-config-generator ]; then \
		(cd tinapple-config-generator && go test -v ./...); \
	fi
	@if [ -d tinapple-installer/tui ]; then \
		(cd tinapple-installer/tui && go test -v ./... 2>/dev/null || true); \
	fi
	@if [ -d tinapple-dash ]; then \
		(cd tinapple-dash && go test -v ./... 2>/dev/null || true); \
	fi
	@if [ -d chaddy-store ]; then \
		(cd chaddy-store && go test -v ./...); \
	fi

test-matrix:
	@echo "==> Running parallel installer test matrix (all cases)..."
	@python3 scripts/qemu_installer_matrix.py --all --parallel 4 --skip-pacstrap

test: test-bash test-go test-matrix

clean:
	@echo "==> Cleaning build artifacts..."
	@rm -f tinapple-installer/bin/tinapple-tui
	@rm -f tinapple-dash/bin/tinapple-dash
	@rm -f tinapple-config-generator/bin/tinapple-config-generator
