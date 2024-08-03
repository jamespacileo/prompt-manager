import { Box, Text, useInput } from "ink";
import type React from "react";
import { useState } from "react";

import TextInput from "ink-text-input";
import { listPrompts } from "../../commands";

interface PromptSearchProps {
	onSelectPrompt: (prompt: any) => void;
}

const PromptSearch: React.FC<PromptSearchProps> = ({ onSelectPrompt }) => {
	const [searchTerm, setSearchTerm] = useState("");
	const [results, setResults] = useState<any[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	const handleSearch = async () => {
		const allPrompts = await listPrompts();
		const filtered = allPrompts.filter(
			(prompt) =>
				prompt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
				prompt.category.toLowerCase().includes(searchTerm.toLowerCase()),
		);
		setResults(filtered);
		setSelectedIndex(0);
	};

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(results.length - 1, selectedIndex + 1));
		} else if (key.return) {
			if (results[selectedIndex]) {
				onSelectPrompt(results[selectedIndex]);
			}
		}
	});

	return (
		<Box flexDirection="column">
			<TextInput
				value={searchTerm}
				onChange={setSearchTerm}
				onSubmit={handleSearch}
				placeholder="Search prompts..."
			/>
			{results.map((prompt, index) => (
				<Text key={index} color={index === selectedIndex ? "green" : undefined}>
					{prompt.category}/{prompt.name} (v{prompt.version})
				</Text>
			))}
			<Text>Use arrow keys to navigate, Enter to select</Text>
		</Box>
	);
};

export default PromptSearch;
