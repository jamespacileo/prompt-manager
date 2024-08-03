import type React from "react";
import type { ReactNode } from "react";
import { Box } from "ink";
import AlertMessage from "./AlertMessage";

interface LayoutProps {
	children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => (
	<Box flexDirection="column" height="100%" width="100%" padding={1}>
		<AlertMessage />
		{children}
	</Box>
);

export default Layout;
