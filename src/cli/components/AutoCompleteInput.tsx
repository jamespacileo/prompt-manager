import React, { useState, useEffect } from 'react';
import { Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { generateAutoComplete } from '../aiHelpers';

interface AutoCompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  context: string;
}

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  context,
}) => {
  const [suggestion, setSuggestion] = useState('');
  const [isTabPressed, setIsTabPressed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (value.length > 0) {
        setIsLoading(true);
        const newSuggestion = await generateAutoComplete({ input: value, context: context });
        setSuggestion(newSuggestion);
      } else {
        setSuggestion('');
      }
      setIsLoading(false);
    };

    fetchSuggestion();
  }, [value]);

  useInput((input, key) => {
    if (key.tab && suggestion) {
      onChange(value + suggestion);
      setIsTabPressed(true);
    } else {
      setIsTabPressed(false);
    }
  });

  return (
    <>
      <TextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        placeholder={placeholder}
      />
      {isLoading && <Text color="gray">Loading...</Text>}
      {!isTabPressed && suggestion && (
        <Text color="gray"> {suggestion}</Text>
      )}
    </>
  );
};

export default AutoCompleteInput;
