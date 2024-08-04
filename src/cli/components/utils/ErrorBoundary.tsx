import { Text } from "ink";
import React from "react";

class ErrorBoundary extends React.Component<
	{ children: React.ReactNode },
	{ hasError: boolean }
> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(_: Error) {
		return { hasError: true };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		logger.error("Uncaught error:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return <Text color="red">Something went wrong. Please try again.</Text>;
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
