import React from 'react';
import { Box, Text } from 'ink';
import { THEME_COLORS } from '@/cli/uiConfig';

export interface OptionCardProps {
    label: string;
    description?: string;
    isActive: boolean;
    isSelected: boolean;
    columns: 1 | 2 | 3;
}

const OptionCard: React.FC<OptionCardProps> = ({ label, description, isActive, isSelected, columns = 2 }) => {
    const borderColor = isActive ? '#FFFF00' : '#FFFACD';
    const width = `${100 / columns}%`;

    return (
        <Box
            width={width}
            flexDirection="column"
            justifyContent="space-between"
            borderStyle="round"
            borderColor={borderColor}
            paddingX={1}
            paddingY={0}
            marginX={0}
            marginY={0}
        >
            <Text color={isActive ? THEME_COLORS.primary : undefined}>
                {isSelected ? '🔥 ' : '○ '}
                {label}
            </Text>
            {description && (
                <Text color={THEME_COLORS.secondary} dimColor wrap="wrap">
                    {description.split('\n').slice(0, 2).join('\n')}
                </Text>
            )}
        </Box>
    );
};

export default OptionCard;