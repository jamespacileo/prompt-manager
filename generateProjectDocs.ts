import * as fs from 'fs/promises';
import * as path from 'path';

// List of relative file paths to include in the documentation
const filesToInclude = [
  'src/promptManager.ts',
  'src/promptModel.ts',
  'src/promptFileSystem.ts',
  'src/config/PromptProjectConfigManager.ts',
  'src/cli/cli.ts',
  "src/cli/commands.ts"
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
    "src/cli/commands.ts": "Command line commands"
    // Add more descriptions as needed
  };
  return descriptions[filePath] || 'No description available';
}

async function generateMarkdownDoc() {
  let markdownContent = '# Project Documentation\n\n';

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
}

generateMarkdownDoc().catch(console.error);
