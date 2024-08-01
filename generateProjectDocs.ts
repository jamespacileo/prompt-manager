import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';

// List of relative file paths to include in the documentation
const filesToInclude = [
  'src/promptManager.ts',
  'src/promptModel.ts',
  'src/promptFileSystem.ts',
  'src/config/PromptProjectConfigManager.ts',
  'src/cli/cli.tsx',
  "src/cli/commands.ts",
  // "src/cli/PromptManagerUI.tsx",
  // "src/cli/components/prompt/PromptSearch.tsx",
  // "src/cli/components/ui/Navigation.tsx",
  // "src/cli/components/ui/Header.tsx",
  "src/types/interfaces.ts",
  // New additions
  "src/cli/PromptManagerUI.tsx",
  "src/cli/screens/HomeScreen.tsx",
  // "src/cli/screens/PromptCreateScreen.tsx",
  // "src/cli/screens/PromptDetailScreen.tsx",
  // "src/cli/screens/PromptListScreen.tsx",
  // "src/cli/screens/StatusScreen.tsx",

  // "src/cli/components/prompt/PromptCreate.tsx",
  // "src/cli/components/prompt/PromptDelete.tsx",
  // "src/cli/components/prompt/PromptEdit.tsx",
  // "src/cli/components/prompt/PromptList.tsx",
  // "src/cli/components/prompt/PromptSearch.tsx",
  // "src/cli/components/prompt/PromptView.tsx",
  // "src/cli/components/ui/ContentWrapper.tsx",
  // "src/cli/components/ui/FireSpinner.tsx",
  // "src/cli/components/ui/Footer.tsx",
  // "src/cli/components/ui/Header.tsx",
  // "src/cli/components/ui/InteractiveElement.tsx",
  // "src/cli/components/ui/Layout.tsx",
  // "src/cli/components/ui/Navigation.tsx",
  // "src/cli/components/ui/ScreenHeader.tsx",
  // "src/cli/components/ui/Spinner.tsx",
  // "src/cli/components/ui/StatusIndicator.tsx",
  // "src/cli/components/utils/AsyncInputHandler.tsx",
  // "src/cli/components/utils/ConfirmationDialog.tsx",
  // "src/cli/components/utils/KeyboardShortcuts.tsx",
  // "src/cli/components/utils/PaginatedList.tsx",
  // "src/cli/components/utils/ScreenWrapper.tsx",

  'src/PromptManagerClientGenerator.ts',
  'src/cli/aiHelpers.ts',
  "src/schemas/prompts.ts",
  // 'src/cli/cli_generate.ts',
  // 'src/config/constants.ts',
  // 'src/generated/promptManagerBase.ts',
  // 'src/initializationManager.ts',
  // 'src/promptModelService.ts',
  // 'src/schemas/config.ts',
  // 'src/schemas/prompts.ts',
  // 'src/scripts/generatePromptManager.ts',
  // 'src/types/interfaces.ts',
  // 'src/utils/cache.ts',
  // 'src/utils/fileUtils.ts',
  // 'src/utils/jsonSchemaToZod.ts',
  // 'src/utils/logger.ts',
  // 'src/utils/promptManagerUtils.ts',
  'src/utils/typeGeneration.ts',
  // 'src/utils/versionUtils.ts',
  // 'test/commands.test.ts',
  // 'test/index.test.ts',
  // 'test/promptFileSystem.test.ts',
  // 'test/promptManager.test.ts',
  // 'test/promptModel.test.ts',
  // 'test/PromptProjectConfigManager.test.ts',
  // 'test/setupEnvs.ts',
  // 'test/setup.ts',
  // 'test/testsUnload.ts'
  // Add more file paths as needed
];

// Function to get a brief description of each file (you may want to customize these)
function getFileDescription(filePath: string): string {
  const descriptions: { [key: string]: string } = {
    'src/promptManager.ts': 'Main class for managing prompts',
    'src/promptModel.ts': 'Model representation of a prompt',
    'src/promptFileSystem.ts': 'Handles file system operations for prompts',
    'src/config/PromptProjectConfigManager.ts': 'Manages project configuration',
    'src/cli/cli.ts': 'Command-line interface for the prompt manager',
    "src/cli/commands.ts": "Command line commands",
    'test/commands.test.ts': 'Tests for command line commands',
    'test/index.test.ts': 'Index test file for initializing tests',
    'test/promptFileSystem.test.ts': 'Tests for prompt file system operations',
    'test/promptManager.test.ts': 'Tests for the prompt manager class',
    'test/promptModel.test.ts': 'Tests for the prompt model representation',
    'test/PromptProjectConfigManager.test.ts': 'Tests for project configuration manager',
    'test/setup.ts': 'Setup file for test configurations',
    'test/testsUnload.ts': 'Tests for unloading modules'
    // Add more descriptions as needed
  };
  return descriptions[filePath] || 'No description available';
}


// Function to get the tree structure of .ts files under ./src
function getTreeStructure(): string {
  try {
    const treeOutput = execSync('tree -P "*.ts" ./src', { encoding: 'utf-8' });
    return treeOutput;
  } catch (error) {
    console.error('Error generating tree structure:', error);
    return '';
  }
}

async function generateMarkdownDoc() {
  let markdownContent = '# Project Documentation\n\n';

  // Add the project structure at the top of the documentation
  const treeStructure = getTreeStructure();
  markdownContent += '## Project Structure\n\n';
  markdownContent += '```\n';
  markdownContent += treeStructure;
  markdownContent += '```\n\n';

  for (const filePath of filesToInclude) {
    const fullPath = path.join(process.cwd(), filePath);
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const description = getFileDescription(filePath);

    markdownContent += `## ${filePath}\n\n`;
    markdownContent += `**Description:** ${description}\n\n`;
    markdownContent += '```typescript\n';
    markdownContent += fileContent;
    markdownContent += '\n```\n\n';
  }

  await fs.writeFile('project_documentation.md', markdownContent);
  console.log('Documentation generated: project_documentation.md');

  const filesList = filesToInclude.join(' ');
  console.log(chalk.green('Useful Commands:'));
  console.log(chalk.blue(`aider --sonnet --no-auto-commit --gui ${filesList}`));
  console.log(chalk.blue(`aider --4o --no-auto-commit --gui ${filesList}`));
  console.log(chalk.blue(`aider --model deepseek/deepseek-coder --no-auto-commit --gui ${filesList}`));

}

generateMarkdownDoc().catch(console.error);
