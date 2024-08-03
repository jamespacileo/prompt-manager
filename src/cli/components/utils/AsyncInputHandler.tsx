import { Box, Text } from "ink";

import TextInput from "ink-text-input";
import { useState } from "react";
import AutoCompleteInput from "../AutoCompleteInput";

interface AsyncInputHandlerProps<T> {
	onSubmit: (value: string) => Promise<T>;
	onSuccess: (result: T) => void;
	placeholder?: string;
	errorMessage?: string;
	context: string;
}

export const AsyncInputHandler = <T,>({
	onSubmit,
	onSuccess,
	placeholder,
	errorMessage,
	context,
}: AsyncInputHandlerProps<T>) => {
	const [value, setValue] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const result = await onSubmit(value);
			onSuccess(result);
		} catch (err) {
			setError(errorMessage || "An error occurred");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Box flexDirection="column">
			<AutoCompleteInput
				value={value}
				onChange={setValue}
				onSubmit={handleSubmit}
				placeholder={placeholder}
				context={context}
			/>
			{isLoading && <Text>Loading...</Text>}
			{error && <Text color="red">{error}</Text>}
		</Box>
	);
};
