import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { THEME_COLORS } from '../uiConfig';

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface OptionSelectProps {
  options: Option[];
  onSelect: (option: Option) => void;
  onCancel?: () => void;
  label?: string;
  separator?: string;
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  options,
  onSelect,
  onCancel,
  label = 'Select an option:',
  separator = '─',
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (key.return) {
      onSelect(options[selectedIndex]);
    } else if (input === 'c' && onCancel) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      <Text color={THEME_COLORS.secondary}>Use ↑↓ arrows to move, Enter to select, C to cancel</Text>
      <Text>{separator.repeat(20)}</Text>
      {options.map((option, index) => (
        <Box key={option.value} flexDirection="column">
          <Text color={index === selectedIndex ? THEME_COLORS.primary : undefined}>
            {index === selectedIndex ? '> ' : '  '}
            {option.label}
          </Text>
          {option.description && (
            <Text color={THEME_COLORS.secondary} dimColor>
              {'  '}
              {option.description}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
};

export default OptionSelect;
