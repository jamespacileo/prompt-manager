import { useEffect, useState } from "react";

import { MAIN_TERM_COLOR } from "../../uiConfig";
import type React from "react";
import { Text } from "ink";

const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

interface SpinnerProps {
	label?: string;
}

const Spinner: React.FC<SpinnerProps> = ({ label = "Loading..." }) => {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame((previousFrame) => (previousFrame + 1) % frames.length);
		}, 80);

		return () => {
			clearInterval(timer);
		};
	}, []);

	return (
		<Text color={MAIN_TERM_COLOR}>
			{frames[frame]} {label}
		</Text>
	);
};

export default Spinner;
