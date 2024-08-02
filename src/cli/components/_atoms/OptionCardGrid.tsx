import React from 'react';
import { Box, Text } from 'ink';
import OptionCard, { OptionCardProps } from '@/cli/components/_atoms/OptionCard';
import { Option } from '../types';
import { useOptionCardGrid } from './useOptionCardGrid';

interface OptionCardGridProps {
    options: Option[];
    columns: 1 | 2 | 3;
    itemsPerPage: number;
    isFocused: boolean;
    onSelect: (selectedOption: Option) => void;
    onCancel?: () => void;
}

const OptionCardGrid: React.FC<OptionCardGridProps> = ({
    options,
    columns,
    itemsPerPage,
    isFocused,
    onSelect,
    onCancel,
}) => {
    const { visibleOptions, selectedIndex, currentPage, totalPages } = useOptionCardGrid({
        options,
        columns,
        itemsPerPage,
        isFocused,
        onSelect,
        onCancel,
    });

    return (
        <Box flexDirection="column">
            <Box flexWrap="wrap" alignItems="flex-start">
                {visibleOptions.map((option: Option, index: number) => (
                    <OptionCard
                        key={index}
                        label={option.label}
                        description={option.description}
                        isActive={index === selectedIndex}
                        isSelected={false} // You may want to implement multi-select logic if needed
                        columns={columns}
                    />
                ))}
            </Box>
            {totalPages > 1 && (
                <Box justifyContent="center" marginY={1}>
                    <Text>
                        Page {currentPage + 1} of {totalPages}
                    </Text>
                </Box>
            )}
        </Box>
    );
};

export default OptionCardGrid;