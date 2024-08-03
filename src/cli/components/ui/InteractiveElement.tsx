import { Text, type TextProps } from "ink";
import type React from "react";
import { THEME_COLORS } from "../../uiConfig";

interface InteractiveElementProps extends TextProps {
	isSelected?: boolean;
}

const InteractiveElement: React.FC<InteractiveElementProps> = ({
	children,
	isSelected,
	...props
}) => {
	return (
		<Text
			color={isSelected ? THEME_COLORS.primary : THEME_COLORS.text}
			backgroundColor={isSelected ? THEME_COLORS.highlight : undefined}
			bold={isSelected}
			{...props}
		>
			{children}
		</Text>
	);
};

export default InteractiveElement;
