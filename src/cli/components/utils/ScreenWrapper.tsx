import { Box } from "ink";
import ContentWrapper from "../ui/ContentWrapper";
import ScreenHeader from "../ui/ScreenHeader";

interface ScreenWrapperProps {
	title: string;
	children: React.ReactNode;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
	title,
	children,
}) => (
	<Box flexDirection="column">
		<ScreenHeader title={title} />
		<ContentWrapper>{children}</ContentWrapper>
	</Box>
);
