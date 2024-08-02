import React, { useState } from 'react';
import { Box, Text } from 'ink';
import OptionCard, { OptionCardProps } from '@/cli/components/_atoms/OptionCard';

interface OptionCardGridProps {
    options: Omit<OptionCardProps, 'columns'>[];
    columns: 1 | 2 | 3;
    itemsPerPage: number;
}

const OptionCardGrid: React.FC<OptionCardGridProps> = ({ options, columns, itemsPerPage }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const totalPages = Math.ceil(options.length / itemsPerPage);

    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOptions = options.slice(startIndex, endIndex);

    return (
        <Box flexDirection="column">
            <Box flexWrap="wrap" alignItems="flex-start">
                {currentOptions.map((option, index) => (
                    <OptionCard key={index} {...option} columns={columns} />
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