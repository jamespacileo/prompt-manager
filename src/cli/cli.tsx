#!/usr/bin/env bun

import "reflect-metadata";
import "./cliPolyfills";

import { Container } from "typedi";
import { PromptFileSystem } from "../promptFileSystem";
import { PromptManager } from "../promptManager";
import PromptManagerUI from "./PromptManagerUI";
import { PromptProjectConfigManager } from "../config/PromptProjectConfigManager";
import React from "react";
import { logger } from "../utils/logger";
import { render } from "ink";

//you need this
process.stdin.resume();

async function ensureInitialized() {
  const configManager = Container.get(PromptProjectConfigManager);
  await configManager.initialize();
  const fileSystem = Container.get(PromptFileSystem);
  await fileSystem.initialize();
  const promptManager = Container.get(PromptManager);
  await promptManager.initialize();
  logger.info("Initialized");
}

async function main() {
  await ensureInitialized();
  const { waitUntilExit, clear } = render(<PromptManagerUI />);

  const cleanup = () => {
    clear();
    logger.info("Exiting gracefully...");
    process.exit(0);
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  try {
    await waitUntilExit();
  } finally {
    cleanup();
  }
}

await main().catch((error) => {
  console.error("An error occurred:", error);
  process.exit(1);
});
// await ensureInitialized();
// render(<PromptManagerUI />);
