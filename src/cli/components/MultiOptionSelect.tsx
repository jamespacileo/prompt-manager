import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { THEME_COLORS } from '../uiConfig';

interface Option {
  label: string;
  value: string;
  description?: string;
}

interface MultiOptionSelectProps {
  options: Option[];
  onSelect: (selectedOptions: Option[]) => void;
  onCancel?: () => void;
  label?: string;
  separator?: string;
  maxSelections?: number;
}

const MultiOptionSelect: React.FC<MultiOptionSelectProps> = ({
  options,
  onSelect,
  onCancel,
  label = 'Select options:',
  separator = '─',
  maxSelections = Infinity,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Option[]>([]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
    } else if (key.downArrow) {
      setSelectedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
    } else if (input === ' ') {
      const option = options[selectedIndex];
      setSelectedOptions((prev) => {
        if (prev.includes(option)) {
          return prev.filter((o) => o !== option);
        } else if (prev.length < maxSelections) {
          return [...prev, option];
        }
        return prev;
      });
    } else if (key.return) {
      onSelect(selectedOptions);
    } else if (input === 'c' && onCancel) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      <Text color={THEME_COLORS.secondary}>
        Use ↑↓ arrows to move, Space to select, Enter to confirm, C to cancel
      </Text>
      <Text>{separator.repeat(20)}</Text>
      {options.map((option, index) => (
        <Box key={option.value} flexDirection="column">
          <Text color={index === selectedIndex ? THEME_COLORS.primary : undefined}>
            {index === selectedIndex ? '> ' : '  '}
            {selectedOptions.includes(option) ? '🔥 ' : '○ '}
            {option.label}
          </Text>
          {option.description && (
            <Text color={THEME_COLORS.secondary} dimColor>
              {'    '}
              {option.description}
            </Text>
          )}
        </Box>
      ))}
      <Text color={THEME_COLORS.secondary}>
        Selected: {selectedOptions.length} / {maxSelections === Infinity ? 'Unlimited' : maxSelections}
      </Text>
    </Box>
  );
};

export default MultiOptionSelect;
