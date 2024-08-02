import React, { useCallback, useState, useEffect } from 'react';
import { Box, Text, useFocusManager, useInput } from 'ink';
import { useAtom } from 'jotai';
import { ScreenWrapper } from '../components/utils/ScreenWrapper';
import OptionSelect from '../components/OptionSelect';
import MultiOptionSelect from '../components/MultiOptionSelect';
import AutoCompleteInput from '../components/AutoCompleteInput';
import { categoryAtom, currentWizardStepAtom, promptNameAtom, tagsAtom } from '../atoms';
import { THEME_COLORS } from '../uiConfig';

const categories = [
  { label: 'Creative Writing', value: 'creative-writing', description: 'For generating stories, poems, and other creative content' },
  { label: 'Code Generation', value: 'code-generation', description: 'For generating code snippets and algorithms' },
  { label: 'Data Analysis', value: 'data-analysis', description: 'For analyzing and interpreting data' },
  { label: 'Chat Bot', value: 'chat-bot', description: 'For creating conversational AI responses' },
];

const tagOptions = [
  { label: 'AI', value: 'ai' },
  { label: 'Machine Learning', value: 'ml' },
  { label: 'Natural Language Processing', value: 'nlp' },
  { label: 'Data Science', value: 'data-science' },
  { label: 'Programming', value: 'programming' },
];

const TestScreen: React.FC = () => {
  const [step, setStep] = useAtom(currentWizardStepAtom);
  const [category, setCategory] = useAtom(categoryAtom);
  const [tags, setTags] = useAtom(tagsAtom);
  const [promptName, setPromptName] = useAtom(promptNameAtom);
  const [isFocused, setIsFocused] = useState(true);

  const { focusNext } = useFocusManager();

  useEffect(() => {
    setIsFocused(true);
  }, [step]);

  useInput((input, key) => {
    if (key.ctrl) {
      if (key.leftArrow) {
        setStep((prevStep) => Math.max(1, prevStep - 1));
      } else if (key.rightArrow) {
        setStep((prevStep) => Math.min(4, prevStep + 1));
      }
    }
  });

  const handleCategorySelect = useCallback((option: { value: string }) => {
    setCategory(option.value);
    setStep(2);
    focusNext();
  }, [setCategory, setStep, focusNext]);

  const handleTagsSelect = useCallback((selectedOptions: { value: string }[]) => {
    setTags(selectedOptions.map(o => o.value));
    setStep(3);
    focusNext();
  }, [setTags, setStep, focusNext]);

  const handlePromptNameSubmit = useCallback(() => {
    setStep(4);
    focusNext();
  }, [setStep, focusNext]);

  const renderStep = useCallback(() => {
    switch (step) {
      case 1:
        return (
          <OptionSelect
            options={categories}
            onSelect={handleCategorySelect}
            label="Select a category for your prompt:"
            isFocused={step === 1}
          />
        );
      case 2:
        return (
          <MultiOptionSelect
            options={tagOptions}
            onSelect={handleTagsSelect}
            label="Select tags for your prompt (max 3):"
            maxSelections={3}
            isFocused={step === 2}
          />
        );
      case 3:
        return (
          <Box flexDirection="column">
            <Text>Enter a name for your prompt:</Text>
            <AutoCompleteInput
              value={promptName}
              onChange={setPromptName}
              onSubmit={handlePromptNameSubmit}
              placeholder="Enter prompt name"
              context={`A prompt name for the category: ${category}`}
              isFocused={step === 3}
            />
          </Box>
        );
      case 4:
        return (
          <Box flexDirection="column">
            <Text bold>Summary:</Text>
            <Text>Category: <Text color={THEME_COLORS.primary}>{category}</Text></Text>
            <Text>Tags: <Text color={THEME_COLORS.primary}>{tags.join(', ')}</Text></Text>
            <Text>Name: <Text color={THEME_COLORS.primary}>{promptName}</Text></Text>
            <Text>Press any key to return to the main menu.</Text>
          </Box>
        );
      default:
        return null;
    }
  }, [step, category, tags, promptName, isFocused]);

  return (
    <ScreenWrapper title="Test Screen">
      <Box flexDirection="column">
        <Text bold>Welcome to the Test Screen</Text>
        <Text>Step {step} of 4</Text>
        {renderStep()}
      </Box>
    </ScreenWrapper>
  );
};

export default TestScreen;
