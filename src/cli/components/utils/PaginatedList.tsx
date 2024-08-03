import chalk from "chalk";
import { Box, Text, useInput } from "ink";
import { useState } from "react";

interface PaginatedListProps<T> {
	items: T[];
	itemsPerPage: number;
	renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
	onSelectItem: (item: T) => void;
}

export const PaginatedList = <T,>({
	items,
	itemsPerPage,
	renderItem,
	onSelectItem,
}: PaginatedListProps<T>) => {
	const [currentPage, setCurrentPage] = useState(0);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const paginatedItems = items.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage,
	);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(paginatedItems.length - 1, selectedIndex + 1));
		} else if (key.return) {
			onSelectItem(paginatedItems[selectedIndex]);
		} else if (
			input === "n" &&
			currentPage < Math.floor(items.length / itemsPerPage) - 1
		) {
			setCurrentPage(currentPage + 1);
			setSelectedIndex(0);
		} else if (input === "p" && currentPage > 0) {
			setCurrentPage(currentPage - 1);
			setSelectedIndex(0);
		}
	});

	return (
		<Box flexDirection="column">
			{paginatedItems.map((item, index) => (
				<Box key={index}>
					{renderItem(item, index, index === selectedIndex)}
				</Box>
			))}
			<Text>
				Page {currentPage + 1} of {Math.ceil(items.length / itemsPerPage)}
			</Text>
			<Text>
				{chalk.gray(
					"Use ↑↓ to navigate, Enter to select, (N)ext/(P)revious page",
				)}
			</Text>
		</Box>
	);
};
