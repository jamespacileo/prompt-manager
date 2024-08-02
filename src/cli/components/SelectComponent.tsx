import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import { THEME_COLORS } from '../uiConfig';
import { useOptionNavigation } from './hooks/useOptionNavigation';
import OptionCard from './_atoms/OptionCard';

export interface Option {
  label: string;
  value: string;
  description?: string;
}

interface SelectComponentProps {
  options: Option[];
  onSelect: (selectedOptions: Option[]) => void;
  onCancel?: () => void;
  label?: string;
  helpText?: string;
  separator?: string;
  maxSelections?: number;
  isFocused?: boolean;
  isMultiSelect?: boolean;
  maxVisibleOptions?: number;
}


const SelectComponent: React.FC<SelectComponentProps> = ({
  options,
  onSelect,
  onCancel,
  label = 'Select option(s):',
  helpText,
  separator = '─',
  maxSelections = Infinity,
  isFocused = false,
  isMultiSelect = false,
  maxVisibleOptions = 9,
}) => {
  const {
    selectedIndex,
    selectedOptions,
    searchTerm,
    pageIndex,
    totalPages,
    visibleOptions,
    toggleOption,
  } = useOptionNavigation({
    options,
    isMultiSelect,
    maxSelections,
    maxVisibleOptions,
    isFocused,
    onSelect,
    onCancel,
  });

  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      {helpText && <Text color={THEME_COLORS.secondary}>{helpText}</Text>}
      <Text color={THEME_COLORS.secondary}>
        {isMultiSelect
          ? 'Use ↑↓ arrows to move, Space to select, Enter to confirm, C to cancel, ←→ to paginate'
          : 'Use ↑↓ arrows to move, Enter to select, C to cancel, ←→ to paginate'}
      </Text>
      <Text>{separator.repeat(20)}</Text>
      <Box flexDirection="row" flexWrap="wrap">
        {visibleOptions.map((option, index) => (
          <OptionCard
            key={option.value}
            label={option.label}
            description={option.description}
            isActive={index === selectedIndex % maxVisibleOptions}
            isSelected={isMultiSelect && selectedOptions.includes(option)}
          />
        ))}
      </Box>
      {isMultiSelect && (
        <Text color={THEME_COLORS.secondary}>
          Selected: {selectedOptions.length} / {maxSelections === Infinity ? 'Unlimited' : maxSelections}
        </Text>
      )}
      {searchTerm && (
        <Text color={THEME_COLORS.secondary}>
          Search: {searchTerm}
        </Text>
      )}
      <Text color={THEME_COLORS.secondary}>
        Page {pageIndex + 1} / {totalPages}
      </Text>
    </Box>
  );
};

export default SelectComponent