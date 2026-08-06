.DEFAULT_GOAL := help

APP_NAME := Claude Monitor
VERSION  := $(shell node -p "require('./package.json').version")
OUT_DIR  := release
APP_PATH := $(OUT_DIR)/mac-universal/$(APP_NAME).app
DMG_PATH := $(OUT_DIR)/$(APP_NAME)-$(VERSION)-universal.dmg

.PHONY: help install dev build test typecheck package open install-app dmg clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install npm dependencies
	npm install

dev: ## Run in development mode (electron-vite + Electron)
	npm run dev

build: ## Type-check and build main/preload/renderer (no packaging)
	npm run build

test: ## Run the unit test suite
	npm test

typecheck: ## Type-check main, preload, and renderer
	npm run typecheck

package: ## Build the double-clickable universal (Intel + Apple Silicon) .app in release/mac-universal/
	npm run package

open: package ## Build (if needed) and open the app
	open "$(APP_PATH)"

install-app: package ## Copy the built app to /Applications (Spotlight/Launchpad launchable)
	rm -rf "/Applications/$(APP_NAME).app"
	cp -R "$(APP_PATH)" "/Applications/$(APP_NAME).app"
	@echo "Installed to /Applications/$(APP_NAME).app"

dmg: package ## Build the .dmg installer and reveal it in Finder
	open -R "$(DMG_PATH)"

clean: ## Remove build output (out/ and release/)
	rm -rf out $(OUT_DIR)
