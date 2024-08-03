import type React from "react";
import { useState } from "react";
import { Text, useStdout } from "ink";

import { useInterval } from "react-use";

const fireFrames = ["🔥", "🔶", "🔸"];
const fireColors = ["#FF4500", "#FFA500", "#FFD700"];

const FireSpinner: React.FC<{ label?: string }> = ({ label = "Loading" }) => {
	const [frame, setFrame] = useState(0);
	const [colorIndex, setColorIndex] = useState(0);
	const { write } = useStdout();

	useInterval(() => {
		setFrame((prevFrame) => (prevFrame + 1) % fireFrames.length);
		setColorIndex((prevIndex) => (prevIndex + 1) % fireColors.length);
		write("\r"); // Move cursor to the beginning of the line
	}, 100);

	return (
		<Text color={fireColors[colorIndex]}>
			{fireFrames[frame]} {label}
		</Text>
	);
};

export default FireSpinner;
