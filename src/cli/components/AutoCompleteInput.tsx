import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { generateAutoComplete } from "../aiHelpers";

interface AutoCompleteInputProps {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	placeholder?: string;
	context: string;
	isFocused?: boolean;
}

const AutoCompleteInput: React.FC<AutoCompleteInputProps> = ({
	value,
	onChange,
	onSubmit,
	placeholder,
	context,
	isFocused = false,
}) => {
	const [suggestion, setSuggestion] = useState("");
	const [isTabPressed, setIsTabPressed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		const fetchSuggestion = async () => {
			if (value.length > 0 && isFocused) {
				setIsLoading(true);
				const newSuggestion = await generateAutoComplete({
					input: value,
					context: context,
				});
				setSuggestion(newSuggestion);
			} else {
				setSuggestion("");
			}
			setIsLoading(false);
		};

		fetchSuggestion();
	}, [value, isFocused, context]);

	useInput((input, key) => {
		if (isFocused && key.tab && suggestion) {
			onChange(value + suggestion);
			setIsTabPressed(true);
		} else {
			setIsTabPressed(false);
		}
	});

	if (!isFocused) {
		return null;
	}

	const memoizedTextInput = useMemo(
		() => (
			<TextInput
				value={value}
				onChange={onChange}
				onSubmit={onSubmit}
				placeholder={placeholder}
			/>
		),
		[value, onChange, onSubmit, placeholder],
	);

	return (
		<Box flexDirection="column">
			{memoizedTextInput}
			{isLoading && <Text color="gray">Loading...</Text>}
			{!isTabPressed && suggestion && <Text color="gray"> {suggestion}</Text>}
		</Box>
	);
};

export default AutoCompleteInput;
