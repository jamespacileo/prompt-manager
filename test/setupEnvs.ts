import fs from 'fs/promises';
import path from 'path';

const TEST_CONFIG = {
  promptsDir: "test_prompts",
  outputDir: "test_output",
  preferredModels: ["test-model"],
  modelParams: {
    "test-model": {
      temperature: 0.5,
      maxTokens: 100
    }
  },
  version: "1.0.0",
  verbosity: 1
};

async function setupTestEnvironment() {
  const testConfigPath = path.join(process.cwd(), 'test-fury-config.json');
  await fs.writeFile(testConfigPath, JSON.stringify(TEST_CONFIG, null, 2), 'utf8');

  const testPromptsDir = path.join(process.cwd(), TEST_CONFIG.promptsDir);
  await fs.mkdir(testPromptsDir, { recursive: true });

  const testPromptsConfig = {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    promptCount: 0
  };
  await fs.writeFile(path.join(testPromptsDir, 'prompts-config.json'), JSON.stringify(testPromptsConfig, null, 2), 'utf8');

  process.env.FURY_PROJECT_CONFIG_FILENAME = "test-fury-config.json";
  process.env.PROMPTS_DIR = TEST_CONFIG.promptsDir;
  process.env.PROMPT_MANAGER_VERBOSE = "true";
  process.env.FURY_VERBOSITY = "1"; // Add this line to set verbosity
}

setupTestEnvironment().catch(console.error);
