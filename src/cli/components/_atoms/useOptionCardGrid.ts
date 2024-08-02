import { useState, useEffect } from 'react';
import { useInput } from 'ink';
import { Option } from '../types';

interface UseOptionCardGridProps {
    options: Option[];
    columns: 1 | 2 | 3;
    itemsPerPage: number;
    isFocused: boolean;
    onSelect: (selectedOption: Option) => void;
    onCancel?: () => void;
}

export const useOptionCardGrid = ({
    options,
    columns,
    itemsPerPage,
    isFocused,
    onSelect,
    onCancel,
}: UseOptionCardGridProps) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    const totalPages = Math.ceil(options.length / itemsPerPage);
    const rowsPerPage = Math.ceil(itemsPerPage / columns);

    // Adjust itemsPerPage to avoid showing less than column count on any page before the last
    const adjustedItemsPerPage = columns * rowsPerPage;

    useEffect(() => {
        setSelectedIndex(0);
        setCurrentPage(0);
    }, [options]);

    const getVisibleOptions = () => {
        const startIndex = currentPage * adjustedItemsPerPage;
        return options.slice(startIndex, startIndex + adjustedItemsPerPage);
    };

    const visibleOptions = getVisibleOptions();

    const getCurrentPosition = () => {
        const row = Math.floor(selectedIndex / columns);
        const col = selectedIndex % columns;
        return { row, col };
    };

    const moveSelection = (direction: 'up' | 'down' | 'left' | 'right') => {
        const { row, col } = getCurrentPosition();
        let newRow = row;
        let newCol = col;

        switch (direction) {
            case 'up':
                newRow = row > 0 ? row - 1 : rowsPerPage - 1;
                break;
            case 'down':
                newRow = (row + 1) % rowsPerPage;
                break;
            case 'left':
                if (col > 0) {
                    newCol = col - 1;
                } else if (currentPage > 0) {
                    setCurrentPage(currentPage - 1);
                    newCol = columns - 1;
                }
                break;
            case 'right':
                if (col < columns - 1 && selectedIndex < visibleOptions.length - 1) {
                    newCol = col + 1;
                } else if (currentPage < totalPages - 1) {
                    setCurrentPage(currentPage + 1);
                    newCol = 0;
                }
                break;
        }

        const newIndex = newRow * columns + newCol;
        if (newIndex < visibleOptions.length) {
            setSelectedIndex(newIndex);
        }
    };

    useInput(
        (input, key) => {
            if (!isFocused) return;

            if (key.upArrow) moveSelection('up');
            else if (key.downArrow) moveSelection('down');
            else if (key.leftArrow) moveSelection('left');
            else if (key.rightArrow) moveSelection('right');
            else if (key.return) onSelect(visibleOptions[selectedIndex]);
            else if (input === 'c' && onCancel) onCancel();
        },
        { isActive: isFocused }
    );

    return {
        visibleOptions,
        selectedIndex,
        currentPage,
        totalPages,
    };
};