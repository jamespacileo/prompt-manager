import * as fs from "node:fs";
import * as path from "node:path";
import * as contrib from "blessed-contrib";
import blessed from "neo-blessed";
import * as React from "react";
import { createBlessedRenderer } from "react-blessed";

const render = createBlessedRenderer(blessed);

interface FileSelectorState {
	currentDirectory: string;
}

interface TreeNode {
	name: string;
	type: "directory" | "file";
	children?: TreeNode[];
}

interface TreeData {
	extended: boolean;
	children: Record<string, TreeNode>;
}

const FileSelector: React.FC = () => {
	const [state, setState] = React.useState<FileSelectorState>({
		currentDirectory: process.cwd(),
	});
	const [treeData, setTreeData] = React.useState<TreeData | null>(null);

	const treeRef = React.useRef<any>(null);

	const tree = React.useMemo(() => {
		return contrib.tree({ fg: "green" });
	}, []);

	React.useEffect(() => {
		loadFiles(state.currentDirectory);
	}, [state.currentDirectory]);

	const loadFiles = (directory: string) => {
		const tree = buildFileTree(directory);
		if (treeRef.current) {
			treeRef.current.setData(tree);
		}
	};

	const buildFileTree = (directory: string) => {
		const files = fs.readdirSync(directory);
		const children: any = {};

		files.forEach((file) => {
			const filePath = path.join(directory, file);
			const stats = fs.statSync(filePath);

			if (stats.isDirectory()) {
				children[file] = { children: buildFileTree(filePath) };
			} else {
				children[file] = {};
			}
		});

		return { extended: true, children };
	};

	const handleSelect = (node: any) => {
		const selectedPath = path.join(state.currentDirectory, node.name);
		if (fs.statSync(selectedPath).isDirectory()) {
			setState({ currentDirectory: selectedPath });
		} else {
			console.log(`Selected file: ${selectedPath}`);
			process.exit(0);
		}
	};

	return (
		<box
			label="File Selector"
			border={{ type: "line" }}
			style={{ border: { fg: "cyan" } }}
			width="100%"
			height="100%"
		>
			{React.createElement(contrib.tree, {
				ref: treeRef,
				style: { text: "green" },
				template: { lines: true },
				label: "File Tree",
				onSelect: handleSelect,
			})}
		</box>
	);
};

// Create a screen object.
const screen = blessed.screen({
	autoPadding: true,
	smartCSR: true,
	title: "React Blessed File Selector",
});

// Quit on Escape, q, or Control-C.
screen.key(["escape", "q", "C-c"], () => process.exit(0));

// Render the React component using react-blessed
render(<FileSelector />, screen);