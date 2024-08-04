import { renderFullScreen } from "@/cli/Fullscreen";
import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import type React from "react";
import { useCallback, useState } from "react";
import { useOptionCardGrid } from "./useOptionCardGrid";

type ColumnDef<T extends { value: string }> = {
	key: keyof T;
	header: string;
	width: string;
	render?: (value: T[keyof T], item: T) => React.ReactNode;
};

type TableProps<T extends { value: string }> = {
	data: T[];
	columns: ColumnDef<T>[];
	keyProp: keyof T;
	selectionMode?: "none" | "single" | "multiple";
	onSelectionChange?: (selectedItems: T[]) => void;
	itemsPerPage?: number;
	isFocused?: boolean;
};

const SelectionIndicator = ({ isSelected }: { isSelected: boolean }) => (
	<Text color={isSelected ? THEME_COLORS.selected : THEME_COLORS.dimmed}>
		{isSelected ? "●" : "○"}
	</Text>
);

function Table<T extends { value: string }>({
	data,
	columns,
	keyProp,
	selectionMode = "none",
	onSelectionChange,
	itemsPerPage = 10,
	isFocused = true,
}: TableProps<T>) {
	const [selectedItems, setSelectedItems] = useState<T[]>([]);
	const {
		visibleOptions: currentData,
		currentPage,
		totalPages,
		selectedOptions,
		startIndex,
		endIndex,
		selectedIndex,
		// goToNextPage,
		// goToPreviousPage,
	} = useOptionCardGrid({
		options: data,
		columns: 1,
		itemsPerPage, // Use the prop value
		isFocused,
		onSelect: (item: T) => {
			if (selectionMode !== "none") {
				onSelectionChange?.(
					selectionMode === "single" ? [item] : selectedOptions,
				);
			}
		},
		onSubmit: () => {},
		onCancel: () => {},
		isMultiSelect: selectionMode === "multiple",
	});

	const handleSelection = useCallback(
		(item: T) => {
			if (selectionMode === "none") return;

			let newSelectedItems: T[];
			if (selectionMode === "single") {
				newSelectedItems = [item];
			} else {
				newSelectedItems = selectedItems.includes(item)
					? selectedItems.filter((i) => i !== item)
					: [...selectedItems, item];
			}

			setSelectedItems(newSelectedItems);
			onSelectionChange?.(newSelectedItems);
		},
		[selectionMode, selectedItems, onSelectionChange],
	);

	const renderCell = (item: T, column: ColumnDef<T>) => {
		const value = item[column.key];
		return column.render ? column.render(value, item) : String(value);
	};

	return (
		<Box flexDirection="column" gap={0}>
			<Box borderStyle="round" borderColor={THEME_COLORS.primary}>
				{selectionMode !== "none" && (
					<Box width="5%">
						<Text bold> </Text>
					</Box>
				)}
				{columns.map((column, index) => (
					<Box key={String(column.key)} width={column.width}>
						<Text bold>{column.header}</Text>
					</Box>
				))}
			</Box>
			{currentData.map((item, rowIndex) => (
				<Box
					key={String(item[keyProp])}
					borderColor={
						rowIndex === selectedIndex
							? THEME_COLORS.active
							: selectedOptions.includes(item)
								? THEME_COLORS.selected
								: THEME_COLORS.dimmed
					}
					borderStyle="round"
				>
					{selectionMode !== "none" && (
						<Box width="5%" justifyContent="center">
							<SelectionIndicator isSelected={selectedOptions.includes(item)} />
						</Box>
					)}
					{columns.map((column, colIndex) => (
						<Box key={String(column.key)} width={column.width}>
							<Text
								color={rowIndex === selectedIndex ? "#ffffff" : undefined}
								dimColor={
									rowIndex !== selectedIndex && !selectedOptions.includes(item)
								}
							>
								{renderCell(item, column)}
							</Text>
						</Box>
					))}
				</Box>
			))}
			<Box marginTop={1}>
				<Text>
					Page {currentPage + 1} of {totalPages} | Items {startIndex + 1}-
					{Math.min(endIndex + 1, data.length)} of {data.length}
				</Text>
				<Text>Selected: {selectedIndex}</Text>
			</Box>
			<Box marginTop={1}>
				<Text dimColor={currentPage === 0}>◀ Prev</Text>
				<Text> | </Text>
				<Text dimColor={currentPage === totalPages - 1}>Next ▶</Text>
			</Box>
			<Box>
				<Text>
					Selected: {selectedOptions.map((item) => item.value).join(", ")}
				</Text>
			</Box>
		</Box>
	);
}

export default Table;

type User = {
	id: number;
	name: string;
	email: string;
	age: number;
	value: string;
};

const data: User[] = [
	{ id: 1, name: "John Doe", email: "john@example.com", age: 30, value: "1" },
	{ id: 2, name: "Jane Smith", email: "jane@example.com", age: 28, value: "2" },
	{ id: 3, name: "Jane Smith", email: "jane@example.com", age: 28, value: "3" },
	{ id: 4, name: "Jane Smith", email: "jane@example.com", age: 28, value: "4" },
	{ id: 5, name: "Jane Smith", email: "jane@example.com", age: 28, value: "5" },
	{ id: 6, name: "Jane Smith", email: "jane@example.com", age: 28, value: "6" },
	{ id: 7, name: "Jane Smith", email: "jane@example.com", age: 28, value: "7" },
	{ id: 8, name: "Jane Smith", email: "jane@example.com", age: 28, value: "8" },
	// ... more data
];

const columns: ColumnDef<User>[] = [
	{ key: "name", header: "Name", width: "30%" },
	{ key: "email", header: "Email", width: "40%" },
	{
		key: "age",
		header: "Age",
		width: "30%",
		render: (value, item) => `${value} years`,
	},
];

const App = () => (
	<Table<User>
		data={data}
		columns={columns}
		keyProp="id"
		selectionMode="multiple"
		onSelectionChange={(selected) => logger.log("Selected:", selected)}
		itemsPerPage={5}
	/>
);

if (import.meta.main) {
	await renderFullScreen(<App />);
}