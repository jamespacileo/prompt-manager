import path from "node:path";
// dev-server.ts
import chokidar from "chokidar";
import React from "react";
import { renderFullScreen } from "./cli/Fullscreen";

let currentRender: { clear: () => void } | null = null;

// Get the app filepath from command line arguments
const appFilepath = process.argv[2];

if (!appFilepath) {
	console.error("Please provide the path to the App or component to run.");
	console.error("Usage: ts-node src/dev-server.ts <path-to-app>");
	process.exit(1);
}

const fullAppPath = path.resolve(process.cwd(), appFilepath);

async function reloadApp() {
	if (currentRender) {
		currentRender.clear();
	}

	// Clear require cache
	Object.keys(require.cache).forEach((id) => {
		if (id.startsWith(process.cwd())) {
			delete require.cache[id];
		}
	});

	try {
		// Re-import and render the app
		const AppModule = await import(fullAppPath);
		const App = AppModule.default || AppModule;

		if (typeof App !== "function") {
			throw new Error(
				"The imported module does not export a valid React component.",
			);
		}

		currentRender = renderFullScreen(React.createElement(App));
	} catch (error) {
		console.error("Error loading or rendering the app:", error);
	}
}

// Watch for file changes in the app directory
const appDir = path.dirname(fullAppPath);
chokidar
	.watch(`${appDir}/**/*.{ts,tsx}`, {
		ignored: /(^|[\/\\])\../,
		persistent: true,
	})
	.on("change", (path) => {
		console.log(`File ${path} has been changed`);
		reloadApp();
	});

console.log(`Watching for changes in ${appDir}`);
console.log(`Hot reloading ${fullAppPath}`);

// Initial render
reloadApp();