import { Box, Text, useInput } from "ink";

import chalk from "chalk";

interface Shortcut {
	key: string;
	description: string;
	action: () => void;
}

interface KeyboardShortcutsProps {
	shortcuts: Shortcut[];
}

export const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({
	shortcuts,
}) => {
	useInput((input) => {
		const shortcut = shortcuts.find((s) => s.key === input);
		if (shortcut) {
			shortcut.action();
		}
	});

	return (
		<Box flexDirection="column">
			{shortcuts.map((shortcut) => (
				<Text key={shortcut.key}>
					Press {chalk.bold(shortcut.key)} to {shortcut.description}
				</Text>
			))}
		</Box>
	);
};
