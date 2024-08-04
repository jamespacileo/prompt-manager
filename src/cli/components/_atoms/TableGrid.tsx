import { renderFullScreen } from "@/cli/Fullscreen";
import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import Table, { type CellProps } from "ink-table";
import type React from "react";
import { useState } from "react";
import type { Option } from "./types";
import { useTableGrid } from "./useTableGrid";

interface TableGridProps<T extends boolean> {
	options: Option[];
	onSelect: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	onSubmit: T extends true
		? (selectedOptions: Option[]) => void
		: (selectedOption: Option) => void;
	isMultiSelect: T;
	itemsPerPage?: number;
	isFocused?: boolean;
}

type ExtendedOption = Option & {
	isSelected: boolean;
	isFocused: boolean;
};

export const TableGrid = <T extends boolean>({
	options,
	onSelect,
	onSubmit,
	isMultiSelect,
	itemsPerPage = 10,
	isFocused = true,
}: TableGridProps<T>) => {
	const {
		visibleOptions,
		selectedIndices,
		focusedIndex,
		currentPage,
		totalPages,
		error,
		handleSelect,
		handleSubmit,
	} = useTableGrid({
		options,
		onSelect,
		onSubmit,
		isMultiSelect,
		itemsPerPage,
		isFocused,
	});

	const tableData: ExtendedOption[] = visibleOptions.map((option, index) => ({
		...option,
		isSelected: selectedIndices.includes(currentPage * itemsPerPage + index),
		isFocused: index === focusedIndex,
	}));

	const CustomCell = ({ column, children }: CellProps) => {
		const rowData = tableData[column];
		return (
			<Text
				color={
					rowData.isSelected
						? THEME_COLORS.selected
						: rowData.isFocused
							? THEME_COLORS.primary
							: undefined
				}
			>
				{children}
			</Text>
		);
	};

	return (
		<Box flexDirection="column">
			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}
			{/* <Table
				data={tableData}
				columns={["label", "value", "description"]}
				cell={CustomCell}
			/> */}
			{totalPages > 1 && (
				<Box justifyContent="center" marginY={1}>
					<Text>
						Page {currentPage + 1} of {totalPages}
					</Text>
				</Box>
			)}
			<Box flexDirection="column" marginTop={1}>
				<Text>
					Use <Text color={THEME_COLORS.primary}>↑/↓</Text> to navigate,{" "}
					{isMultiSelect ? (
						<>
							<Text color={THEME_COLORS.primary}>Space</Text> to
							select/deselect, <Text color={THEME_COLORS.primary}>S</Text> to
							submit
						</>
					) : (
						<Text color={THEME_COLORS.primary}>Enter</Text>
					)}{" "}
					to select
				</Text>
				<Text>
					<Text color={THEME_COLORS.primary}>PgUp/PgDown</Text> to change pages,{" "}
					<Text color={THEME_COLORS.primary}>Home/End</Text> to jump to
					start/end
				</Text>
			</Box>
		</Box>
	);
};

const generateRandomOptions = (count: number): Option[] => {
	return Array.from({ length: count }, (_, index) => ({
		label: `Option ${index + 1}`,
		value: `${index + 1}`,
		description: `This is a randomly generated option ${index + 1}`,
	}));
};

const testOptions: Option[] = generateRandomOptions(20);

const TestComponent: React.FC = () => {
	const [isMultiSelect, setIsMultiSelect] = useState(true);
	const [lastSelected, setLastSelected] = useState<Option | Option[] | null>(
		null,
	);
	const [lastSubmitted, setLastSubmitted] = useState<Option | Option[] | null>(
		null,
	);

	const handleSelect = (selected: Option | Option[]) => {
		setLastSelected(selected);
		logger.log("Selected:", selected);
	};

	const handleSubmit = (submitted: Option | Option[]) => {
		setLastSubmitted(submitted);
		logger.log("Submitted:", submitted);
	};

	const toggleMultiSelect = () => {
		setIsMultiSelect(!isMultiSelect);
		setLastSelected(null);
		setLastSubmitted(null);
	};

	return (
		<Box flexDirection="column">
			<Text>Press 'T' to toggle between single and multi-select</Text>
			<Text>
				Current mode: {isMultiSelect ? "Multi-select" : "Single-select"}
			</Text>
			<Box marginY={1}>
				<TableGrid
					options={testOptions}
					onSelect={handleSelect}
					onSubmit={handleSubmit}
					isMultiSelect={isMultiSelect}
					isFocused={true}
					itemsPerPage={10}
				/>
			</Box>
			<Text>Last Selected: {JSON.stringify(lastSelected)}</Text>
			<Text>Last Submitted: {JSON.stringify(lastSubmitted)}</Text>
		</Box>
	);
};

if (import.meta.main) {
	await renderFullScreen(<TestComponent />);
	// Simulate user input
	// setTimeout(() => {
	//   // Navigate down
	//   stdin.write('\x1B[B');
	//   // Select an option
	//   stdin.write(' ');
	//   // Submit
	//   stdin.write('s');
	//   // Toggle multi-select
	//   stdin.write('t');
	//   // Select another option
	//   stdin.write(' ');
	//   // Submit in single-select mode
	//   stdin.write('\r');
	// }, 100);
	// Clean up
	// setTimeout(() => {
	//   unmount();
	// }, 1000);
}
import { logger } from "../../../utils/logger";
