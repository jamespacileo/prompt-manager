import { Box, Text } from "ink";
import React, { useState, type ReactElement } from "react";

interface WizardStep {
	title: string;
	component: ReactElement;
}

interface WizardMenuProps {
	steps: WizardStep[];
	onComplete: (results: any[]) => void;
}

const WizardMenu: React.FC<WizardMenuProps> = ({ steps, onComplete }) => {
	const [currentStep, setCurrentStep] = useState(0);
	const [results, setResults] = useState<any[]>([]);

	const handleStepComplete = (result: any) => {
		const newResults = [...results, result];
		if (currentStep < steps.length - 1) {
			setResults(newResults);
			setCurrentStep((prev) => prev + 1);
		} else {
			onComplete(newResults);
		}
	};

	const currentStepData = steps[currentStep];

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text>
					Step {currentStep + 1} of {steps.length}: {currentStepData.title}
				</Text>
			</Box>
			{React.cloneElement(currentStepData.component, {
				onComplete: handleStepComplete,
			})}
		</Box>
	);
};

export default WizardMenu;
