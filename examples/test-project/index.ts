import { PromptManager } from '../../src/promptManager';

async function main() {
  const promptManager = new PromptManager('./prompts');
  await promptManager.initialize();

  // Create a new prompt
  await promptManager.createPrompt({
    name: 'greeting',
    category: 'general',
    version: '1.0.0',
    content: 'Hello, {{name}}! Welcome to {{place}}.',
    parameters: ['name', 'place'],
    metadata: {
      description: 'A simple greeting prompt',
      created: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    },
  });

  // Get and format the prompt
  const prompt = promptManager.getPrompt('general', 'greeting');
  const formattedPrompt = promptManager.formatPrompt('general', 'greeting', {
    name: 'Alice',
    place: 'Wonderland',
  });

  console.log('Raw prompt:', prompt.content);
  console.log('Formatted prompt:', formattedPrompt);

  // List all prompts
  const prompts = await promptManager.listPrompts();
  console.log('All prompts:', prompts);

  // Update the prompt
  await promptManager.updatePrompt('general/greeting', {
    content: 'Greetings, {{name}}! Welcome to the magical {{place}}.',
  });

  // Get the updated prompt
  const updatedPrompt = promptManager.getPrompt('general', 'greeting');
  console.log('Updated prompt:', updatedPrompt.content);

  // Version control
  await promptManager.versionPrompt('create', 'general/greeting');
  await promptManager.versionPrompt('list', 'general/greeting');

  // Delete the prompt
  await promptManager.deletePrompt('general/greeting');
  console.log('Prompt deleted');
}

main().catch(console.error);
