import { Box, Text, useInput } from "ink";
import type React from "react";
import { useEffect, useState } from "react";

import { listPrompts } from "../../commands";

interface PromptListProps {
	onSelectPrompt: (prompt: any) => void;
}

const PromptList: React.FC<PromptListProps> = ({ onSelectPrompt }) => {
	const [prompts, setPrompts] = useState<
		Array<{ category: string; name: string; version: string }>
	>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	useEffect(() => {
		listPrompts().then(setPrompts);
	}, []);

	useInput((input, key) => {
		if (key.upArrow) {
			setSelectedIndex(Math.max(0, selectedIndex - 1));
		} else if (key.downArrow) {
			setSelectedIndex(Math.min(prompts.length - 1, selectedIndex + 1));
		} else if (key.return) {
			onSelectPrompt(prompts[selectedIndex]);
		}
	});

	return (
		<Box flexDirection="column">
			{prompts.map((prompt) => (
				<Text
					key={`${prompt.category}-${prompt.name}`}
					color={prompt === prompts[selectedIndex] ? "green" : undefined}
				>
					{prompt.category}/{prompt.name} (v{prompt.version})
				</Text>
			))}
		</Box>
	);
};

export default PromptList;
