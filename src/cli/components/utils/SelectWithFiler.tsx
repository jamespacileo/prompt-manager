import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { THEME_COLORS } from '../../uiConfig';

interface Option {
    label: string;
    value: string;
}

interface SelectWithFilterProps {
    options: Option[];
    onSelect: (option: Option) => void;
    title?: string;
    helpText?: string;
    allowOther?: boolean;
    isFocused?: boolean;
}

const SelectWithFilter: React.FC<SelectWithFilterProps> = ({
    options,
    onSelect,
    title = 'Select an option:',
    helpText = 'Type to filter, use Ctrl+[1-9] to select, or Enter for custom input',
    allowOther = true,
    isFocused = true
}) => {
    const [filter, setFilter] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [isCustomInput, setIsCustomInput] = useState(false);

    useEffect(() => {
        setFilteredOptions(
            options.filter((option) =>
                option.label.toLowerCase().includes(filter.toLowerCase())
            )
        );
    }, [filter, options]);

    useInput((input, key) => {
        if (key.ctrl && input >= '1' && input <= '9') {
            const index = parseInt(input) - 1;
            if (index < filteredOptions.length) {
                onSelect(filteredOptions[index]);
            }
        } else if (key.return) {
            if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
                onSelect(filteredOptions[selectedIndex]);
            } else if (allowOther) {
                setIsCustomInput(true);
            }
        } else if (key.upArrow) {
            setSelectedIndex((prev) => Math.max(prev - 1, -1));
        } else if (key.downArrow) {
            setSelectedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        }
    }, { isActive: isFocused });

    const renderOptions = () => {
        const rows = [];
        for (let i = 0; i < filteredOptions.length; i += 3) {
            rows.push(
                <Box key={i}>
                    {filteredOptions.slice(i, i + 3).map((option, index) => (
                        <Box key={option.value} width="33%">
                            <Text color={selectedIndex === i + index ? THEME_COLORS.primary : undefined}>
                                {`${i + index + 1}. ${option.label}`}
                            </Text>
                        </Box>
                    ))}
                </Box>
            );
        }
        return rows;
    };

    return (
        <Box flexDirection="column">
            {title && <Text bold>{title}</Text>}
            {helpText && <Text color={THEME_COLORS.secondary}>{helpText}</Text>}
            <TextInput
                value={filter}
                onChange={setFilter}
                placeholder="Type to filter options..."
            />
            {renderOptions()}
            {allowOther && (
                <Text color={THEME_COLORS.secondary}>
                    Press Enter for custom input
                </Text>
            )}
            {isCustomInput && (
                <TextInput
                    value={filter}
                    onChange={setFilter}
                    onSubmit={(value) => onSelect({ label: value, value })}
                    placeholder="Enter custom value..."
                />
            )}
        </Box>
    );
};

export default SelectWithFilter;