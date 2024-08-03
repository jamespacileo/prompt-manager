import { Box, Text, useInput } from "ink";
import type React from "react";
import { useEffect, useState } from "react";
import { THEME_COLORS } from "../uiConfig";
import OptionCard from "./_atoms/OptionCard";
import { useOptionNavigation } from "./hooks/useOptionNavigation";

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
	label = "Select option(s):",
	helpText,
	separator = "─",
	maxSelections = Number.POSITIVE_INFINITY,
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
					? "Use ↑↓ arrows to move, Space to select, Enter to confirm, C to cancel, ←→ to paginate"
					: "Use ↑↓ arrows to move, Enter to select, C to cancel, ←→ to paginate"}
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
						columns={2}
					/>
				))}
			</Box>
			{isMultiSelect && (
				<Text color={THEME_COLORS.secondary}>
					Selected: {selectedOptions.length} /{" "}
					{maxSelections === Number.POSITIVE_INFINITY
						? "Unlimited"
						: maxSelections}
				</Text>
			)}
			{searchTerm && (
				<Text color={THEME_COLORS.secondary}>Search: {searchTerm}</Text>
			)}
			<Text color={THEME_COLORS.secondary}>
				Page {pageIndex + 1} / {totalPages}
			</Text>
		</Box>
	);
};

export default SelectComponent;
