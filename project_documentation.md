# Project Documentation

## Project Structure

```
./src
├── PromptManagerClientGenerator.ts
├── cli
│   ├── aiHelpers.ts
│   ├── atoms.ts
│   ├── cliPolyfills.ts
│   ├── cli_generate.ts
│   ├── commands.ts
│   ├── components
│   │   ├── _atoms
│   │   │   ├── types.ts
│   │   │   ├── useOptionCardGrid.ts
│   │   │   └── useTableGrid.ts
│   │   ├── hooks
│   │   │   └── useOptionNavigation.ts
│   │   ├── prompt
│   │   ├── types.ts
│   │   ├── ui
│   │   └── utils
│   ├── screens
│   ├── uiConfig.ts
│   └── utils
├── client.ts
├── config
│   ├── PromptProjectConfigManager.ts
│   └── constants.ts
├── config.ts
├── fixtures
│   └── categories.ts
├── generated
│   ├── index.ts
│   └── promptManagerBase.ts
├── generated.ts
├── index.ts
├── initializationManager.ts
├── promptFileSystem.ts
├── promptManager.ts
├── promptModel.ts
├── promptModelService.ts
├── schemas
│   ├── config.ts
│   └── prompts.ts
├── scripts
│   └── generatePromptManager.ts
├── test
│   ├── PromptProjectConfigManager.test.d.ts
│   ├── PromptProjectConfigManager.test.ts
│   ├── __snapshots__
│   ├── commands.test.d.ts
│   ├── commands.test.ts
│   ├── index.test.d.ts
│   ├── index.test.ts
│   ├── promptFileSystem.test.d.ts
│   ├── promptFileSystem.test.ts
│   ├── promptManager.test.d.ts
│   ├── promptManager.test.ts
│   ├── promptManagerUtils.test.ts
│   ├── promptModel.test.d.ts
│   ├── promptModel.test.ts
│   ├── setup.d.ts
│   ├── setup.ts
│   ├── setupEnvs.d.ts
│   ├── setupEnvs.ts
│   ├── testsUnload.d.ts
│   └── testsUnload.ts
├── types
│   ├── index.ts
│   └── interfaces.ts
└── utils
    ├── __snapshots__
    ├── cache.ts
    ├── fileSystemUtils.ts
    ├── fileTransaction.ts
    ├── fileUtils.ts
    ├── jsonSchemaToZod.ts
    ├── lockUtils.ts
    ├── logger.ts
    ├── promptManagerUtils.ts
    ├── typeGeneration.test.ts
    ├── typeGeneration.ts
    └── versionUtils.ts

20 directories, 61 files
```

## src/cli/components/_atoms/table.tsx

**Description:** No description available

```typescript
import { Box, Text } from "ink";
import { sha1 } from "object-hash";
import React from "react";

/* Table */

type Scalar = string | number | boolean | null | undefined;

type ScalarDict = {
	[key: string]: Scalar;
};

export type CellProps = React.PropsWithChildren<{ column: number }>;

export type TableProps<T extends ScalarDict> = {
	/**
	 * List of values (rows).
	 */
	data: T[];
	/**
	 * Columns that we should display in the table.
	 */
	columns: (keyof T)[];
	/**
	 * Cell padding.
	 */
	padding: number;
	/**
	 * Header component.
	 */
	header: (props: React.PropsWithChildren<{}>) => JSX.Element;
	/**
	 * Component used to render a cell in the table.
	 */
	cell: (props: CellProps) => JSX.Element;
	/**
	 * Component used to render the skeleton of the table.
	 */
	skeleton: (props: React.PropsWithChildren<{}>) => JSX.Element;
};

/* Table */

export default class Table<T extends ScalarDict> extends React.Component<
	Pick<TableProps<T>, "data"> & Partial<TableProps<T>>
> {
	/* Config */

	/**
	 * Merges provided configuration with defaults.
	 */
	getConfig(): TableProps<T> {
		return {
			data: this.props.data,
			columns: this.props.columns || this.getDataKeys(),
			padding: this.props.padding || 1,
			header: this.props.header || Header,
			cell: this.props.cell || Cell,
			skeleton: this.props.skeleton || Skeleton,
		};
	}

	/**
	 * Gets all keyes used in data by traversing through the data.
	 */
	getDataKeys(): (keyof T)[] {
		const keys = new Set<keyof T>();

		// Collect all the keys.
		for (const data of this.props.data) {
			for (const key in data) {
				keys.add(key);
			}
		}

		return Array.from(keys);
	}

	/**
	 * Calculates the width of each column by finding
	 * the longest value in a cell of a particular column.
	 *
	 * Returns a list of column names and their widths.
	 */
	getColumns(): Column<T>[] {
		const { columns, padding } = this.getConfig();

		const widths: Column<T>[] = columns.map((key) => {
			const header = String(key).length;
			/* Get the width of each cell in the column */
			const data = this.props.data.map((data) => {
				const value = data[key];

				if (value == undefined || value == null) return 0;
				return String(value).length;
			});

			const width = Math.max(...data, header) + padding * 2;

			/* Construct a cell */
			return {
				column: key,
				width: width,
				key: String(key),
			};
		});

		return widths;
	}

	/**
	 * Returns a (data) row representing the headings.
	 */
	getHeadings(): Partial<T> {
		const { columns } = this.getConfig();

		const headings: Partial<T> = columns.reduce(
			(acc, column) => ({ ...acc, [column]: column }),
			{},
		);

		return headings;
	}

	/* Rendering utilities */

	// The top most line in the table.
	header = row<T>({
		cell: this.getConfig().skeleton,
		padding: this.getConfig().padding,
		skeleton: {
			component: this.getConfig().skeleton,
			// chars
			line: "─",
			left: "┌",
			right: "┐",
			cross: "┬",
		},
	});

	// The line with column names.
	heading = row<T>({
		cell: this.getConfig().header,
		padding: this.getConfig().padding,
		skeleton: {
			component: this.getConfig().skeleton,
			// chars
			line: " ",
			left: "│",
			right: "│",
			cross: "│",
		},
	});

	// The line that separates rows.
	separator = row<T>({
		cell: this.getConfig().skeleton,
		padding: this.getConfig().padding,
		skeleton: {
			component: this.getConfig().skeleton,
			// chars
			line: "─",
			left: "├",
			right: "┤",
			cross: "┼",
		},
	});

	// The row with the data.
	data = row<T>({
		cell: this.getConfig().cell,
		padding: this.getConfig().padding,
		skeleton: {
			component: this.getConfig().skeleton,
			// chars
			line: " ",
			left: "│",
			right: "│",
			cross: "│",
		},
	});

	// The bottom most line of the table.
	footer = row<T>({
		cell: this.getConfig().skeleton,
		padding: this.getConfig().padding,
		skeleton: {
			component: this.getConfig().skeleton,
			// chars
			line: "─",
			left: "└",
			right: "┘",
			cross: "┴",
		},
	});

	/* Render */

	render() {
		/* Data */
		const columns = this.getColumns();
		const headings = this.getHeadings();

		/**
		 * Render the table line by line.
		 */
		return (
			<Box flexDirection="column">
				{/* Header */}
				{this.header({ key: "header", columns, data: {} })}
				{this.heading({ key: "heading", columns, data: headings })}
				{/* Data */}
				{this.props.data.map((row, index) => {
					// Calculate the hash of the row based on its value and position
					const key = `row-${sha1(row)}-${index}`;

					// Construct a row.
					return (
						<Box flexDirection="column" key={key}>
							{this.separator({ key: `separator-${key}`, columns, data: {} })}
							{this.data({ key: `data-${key}`, columns, data: row })}
						</Box>
					);
				})}
				{/* Footer */}
				{this.footer({ key: "footer", columns, data: {} })}
			</Box>
		);
	}
}

/* Helper components */

type RowConfig = {
	/**
	 * Component used to render cells.
	 */
	cell: (props: CellProps) => JSX.Element;
	/**
	 * Tells the padding of each cell.
	 */
	padding: number;
	/**
	 * Component used to render skeleton in the row.
	 */
	skeleton: {
		component: (props: React.PropsWithChildren<{}>) => JSX.Element;
		/**
		 * Characters used in skeleton.
		 *    |             |
		 * (left)-(line)-(cross)-(line)-(right)
		 *    |             |
		 */
		left: string;
		right: string;
		cross: string;
		line: string;
	};
};

type RowProps<T extends ScalarDict> = {
	key: string;
	data: Partial<T>;
	columns: Column<T>[];
};

type Column<T> = {
	key: string;
	column: keyof T;
	width: number;
};

/**
 * Constructs a Row element from the configuration.
 */
function row<T extends ScalarDict>(
	config: RowConfig,
): (props: RowProps<T>) => JSX.Element {
	/* This is a component builder. We return a function. */

	const skeleton = config.skeleton;

	/* Row */
	return (props) => (
		<Box flexDirection="row">
			{/* Left */}
			<skeleton.component>{skeleton.left}</skeleton.component>
			{/* Data */}
			{...intersperse(
				(i) => {
					const key = `${props.key}-hseparator-${i}`;

					// The horizontal separator.
					return (
						<skeleton.component key={key}>{skeleton.cross}</skeleton.component>
					);
				},

				// Values.
				props.columns.map((column, colI) => {
					// content
					const value = props.data[column.column];

					if (value == undefined || value == null) {
						const key = `${props.key}-empty-${column.key}`;

						return (
							<config.cell key={key} column={colI}>
								{skeleton.line.repeat(column.width)}
							</config.cell>
						);
					} else {
						const key = `${props.key}-cell-${column.key}`;

						// margins
						const ml = config.padding;
						const mr = column.width - String(value).length - config.padding;

						return (
							/* prettier-ignore */
							<config.cell key={key} column={colI}>
								{`${skeleton.line.repeat(ml)}${String(value)}${skeleton.line.repeat(mr)}`}
							</config.cell>
						);
					}
				}),
			)}
			{/* Right */}
			<skeleton.component>{skeleton.right}</skeleton.component>
		</Box>
	);
}

/**
 * Renders the header of a table.
 */
export function Header(props: React.PropsWithChildren<{}>) {
	return (
		<Text bold color="blue">
			{props.children}
		</Text>
	);
}

/**
 * Renders a cell in the table.
 */
export function Cell(props: CellProps) {
	return <Text>{props.children}</Text>;
}

/**
 * Redners the scaffold of the table.
 */
export function Skeleton(props: React.PropsWithChildren<{}>) {
	return <Text bold>{props.children}</Text>;
}

/* Utility functions */

/**
 * Intersperses a list of elements with another element.
 */
function intersperse<T, I>(
	intersperser: (index: number) => I,
	elements: T[],
): (T | I)[] {
	// Intersparse by reducing from left.
	const interspersed: (T | I)[] = elements.reduce(
		(acc, element, index) => {
			// Only add element if it's the first one.
			if (acc.length === 0) return [element];
			// Add the intersparser as well otherwise.
			return [...acc, intersperser(index), element];
		},
		[] as (T | I)[],
	);

	return interspersed;
}
```

## src/cli/components/_atoms/TableRow.tsx

**Description:** No description available

```typescript
import { THEME_COLORS } from "@/cli/uiConfig";
import { Box, Text } from "ink";
import type React from "react";
import type { Option } from "./types";

interface TableRowProps {
	option: Option;
	isSelected: boolean;
	isFocused: boolean;
	isMultiSelect: boolean;
	onSelect: () => void;
}

export const TableRow: React.FC<TableRowProps> = ({
	option,
	isSelected,
	isFocused,
	isMultiSelect,
	onSelect,
}) => {
	const borderColor = isFocused ? THEME_COLORS.primary : THEME_COLORS.secondary;
	const backgroundColor = isSelected ? THEME_COLORS.selected : undefined;

	return (
		<Box
			borderStyle="round"
			borderColor={borderColor}
			// backgroundColor={backgroundColor}
			paddingX={1}
			paddingY={0}
			marginY={0}
		>
			<Box width="100%" flexDirection="column">
				<Text
					color={
						isSelected
							? THEME_COLORS.selected
							: isFocused
								? THEME_COLORS.primary
								: undefined
					}
					bold={isFocused || isSelected}
				>
					{isMultiSelect ? (isSelected ? "✓ " : "  ") : ""}
					{option.label}
				</Text>
				{option.description && (
					<Text
						color={isFocused ? "#ffffff" : THEME_COLORS.secondary}
						dimColor={!isFocused}
					>
						{"  "}
						{option.description}
					</Text>
				)}
			</Box>
		</Box>
	);
};

```

## src/cli/components/_atoms/TableGrid.tsx

**Description:** No description available

```typescript
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

	return (
		<Box flexDirection="column">
			{error && (
				<Box marginBottom={1}>
					<Text color="red">{error}</Text>
				</Box>
			)}
			<Table
				data={tableData}
				columns={["label", "value", "description"]}
				cell={({ row, column }) => {
					return (
						<Text
							color={
								row.isSelected
									? THEME_COLORS.selected
									: row.isFocused
										? THEME_COLORS.primary // Use primary color for focused items
										: undefined
							}
						>
							{row[column as keyof ExtendedOption]}
						</Text>
					);
				}}
			/>
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
		console.log("Selected:", selected);
	};

	const handleSubmit = (submitted: Option | Option[]) => {
		setLastSubmitted(submitted);
		console.log("Submitted:", submitted);
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

```

## src/cli/components/_atoms/useTableGrid.ts

**Description:** No description available

```typescript
import { useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import type { Option } from "./types";

interface UseTableGridProps<T extends boolean> {
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

export const useTableGrid = <T extends boolean>({
	options,
	onSelect,
	onSubmit,
	isMultiSelect,
	itemsPerPage = 10,
	isFocused = true,
}: UseTableGridProps<T>) => {
	const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [currentPage, setCurrentPage] = useState(0);
	const [error, setError] = useState<string | null>(null);

	const totalPages = Math.ceil(options.length / itemsPerPage);

	const visibleOptions = options.slice(
		currentPage * itemsPerPage,
		(currentPage + 1) * itemsPerPage,
	);

	const handleKeyPress = useCallback(
		(input: string, key: any) => {
			if (!isFocused) return;

			if (key.upArrow) {
				setFocusedIndex((prev) =>
					prev > 0 ? prev - 1 : visibleOptions.length - 1,
				);
			} else if (key.downArrow) {
				setFocusedIndex((prev) =>
					prev < visibleOptions.length - 1 ? prev + 1 : 0,
				);
			} else if (key.return || (isMultiSelect && input === " ")) {
				handleSelect(focusedIndex);
			} else if (key.pageUp) {
				changePage("prev");
			} else if (key.pageDown) {
				changePage("next");
			} else if (key.home) {
				setFocusedIndex(0);
			} else if (key.end) {
				setFocusedIndex(visibleOptions.length - 1);
			} else if (input === "c") {
				// Cancel/Clear selection
				setSelectedIndices([]);
			} else if (input === "s") {
				handleSubmit();
			}
		},
		[visibleOptions, focusedIndex, isMultiSelect, isFocused],
	);

	useInput(handleKeyPress);

	const handleSelect = useCallback(
		(index: number) => {
			const actualIndex = currentPage * itemsPerPage + index;
			if (isMultiSelect) {
				setSelectedIndices((prev) =>
					prev.includes(actualIndex)
						? prev.filter((i) => i !== actualIndex)
						: [...prev, actualIndex],
				);
			} else {
				setSelectedIndices([actualIndex]);
			}
			const selectedOptions = options.filter((_, i) =>
				isMultiSelect ? selectedIndices.includes(i) : i === actualIndex,
			);
			(onSelect as (selected: Option | Option[]) => void)(
				isMultiSelect ? selectedOptions : selectedOptions[0],
			);
		},
		[
			options,
			selectedIndices,
			isMultiSelect,
			currentPage,
			itemsPerPage,
			onSelect,
		],
	);

	const handleSubmit = useCallback(() => {
		if (selectedIndices.length === 0) {
			setError("Please select at least one option before submitting.");
		} else {
			const selectedOptions = options.filter((_, i) =>
				selectedIndices.includes(i),
			);
			(onSubmit as (selected: Option | Option[]) => void)(
				isMultiSelect ? selectedOptions : selectedOptions[0],
			);
			setError(null);
		}
	}, [options, selectedIndices, onSubmit, isMultiSelect]);

	const changePage = (direction: "prev" | "next") => {
		setCurrentPage((prev) => {
			if (direction === "prev" && prev > 0) return prev - 1;
			if (direction === "next" && prev < totalPages - 1) return prev + 1;
			return prev;
		});
		setFocusedIndex(0);
	};

	useEffect(() => {
		if (options.length === 0) {
			setError("No options available.");
		} else {
			setError(null);
		}
	}, [options]);

	return {
		visibleOptions,
		selectedIndices,
		focusedIndex,
		currentPage,
		totalPages,
		error,
		handleSelect,
		handleSubmit,
	};
};

```

