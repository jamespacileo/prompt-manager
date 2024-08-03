import { useCallback, useEffect, useState } from "react";
import { Box, Text, useFocusManager, useInput } from "ink";
import { useAtom } from "jotai";
import {
	categoryAtom,
	currentWizardStepAtom,
	promptNameAtom,
	tagsAtom,
} from "../atoms";
import { promptCategoryKeys } from "@/fixtures/categories";
import AutoCompleteInput from "../components/AutoCompleteInput";
import MultiOptionSelect from "../components/MultiOptionSelect";
import OptionSelect from "../components/OptionSelect";
import OptionCardGrid from "../components/_atoms/OptionCardGrid";
import { ScreenWrapper } from "../components/utils/ScreenWrapper";
import { THEME_COLORS } from "../uiConfig";
import type { Option } from "../components/_atoms/types";
import ErrorBoundary from "../components/utils/ErrorBoundary";

const tagOptions = [
	{ label: "AI", value: "ai" },
	{ label: "Machine Learning", value: "ml" },
	{ label: "Natural Language Processing", value: "nlp" },
	{ label: "Data Science", value: "data-science" },
	{ label: "Programming", value: "programming" },
];

type StepProps = {
	step: number;
	category: string;
	tags: string[];
	promptName: string;
	handleCategorySelect: (selectedOption: Option) => void;
	handleTagsSelect: (selectedOptions: { value: string }[]) => void;
	handlePromptNameSubmit: () => void;
	setPromptName: (name: string) => void;
};

const stepComponents: Record<number, React.FC<StepProps>> = {
	1: ({ handleCategorySelect, step }) => (
		<OptionSelect
			options={promptCategoryKeys}
			onSelect={handleCategorySelect}
			label="Select a category for your prompt:"
			isFocused={step === 1}
			isMultiSelect={false}
		/>
	),
	2: ({ handleTagsSelect, step }) => (
		<MultiOptionSelect
			options={tagOptions}
			onSelect={handleTagsSelect}
			label="Select tags for your prompt (max 3):"
			maxSelections={3}
			isFocused={step === 2}
			isMultiSelect={true}
		/>
	),
	3: ({ promptName, setPromptName, handlePromptNameSubmit, step }) => (
		<Box flexDirection="column">
			<Text>Enter a name for your prompt:</Text>
			<AutoCompleteInput
				value={promptName}
				onChange={setPromptName}
				onSubmit={handlePromptNameSubmit}
				placeholder="Enter prompt name"
				context={`A prompt name for the category: ${promptName}`}
				isFocused={step === 3}
			/>
		</Box>
	),
	4: ({ category, tags, promptName }) => (
		<Box flexDirection="column">
			<Text bold>Summary:</Text>
			<Text>
				Category: <Text color={THEME_COLORS.primary}>{category}</Text>
			</Text>
			<Text>
				Tags: <Text color={THEME_COLORS.primary}>{tags.join(", ")}</Text>
			</Text>
			<Text>
				Name: <Text color={THEME_COLORS.primary}>{promptName}</Text>
			</Text>
			<Text>Press any key to return to the main menu.</Text>
		</Box>
	),
};

const TestScreen: React.FC = () => {
	const [step, setStep] = useAtom(currentWizardStepAtom);
	const [category, setCategory] = useAtom(categoryAtom);
	const [tags, setTags] = useAtom(tagsAtom);
	const [promptName, setPromptName] = useAtom(promptNameAtom);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { focusNext } = useFocusManager();

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		// Reset error when step changes
		setError(null);
	}, [step]);

	useInput((input, key) => {
		if (key.ctrl) {
			if (key.leftArrow) {
				setStep((prevStep) => Math.max(1, prevStep - 1));
			} else if (key.rightArrow) {
				setStep((prevStep) => Math.min(4, prevStep + 1));
			}
		}
	});

	const handleCategorySelect = useCallback(
		(selectedOption: Option & { description?: string }) => {
			setCategory(selectedOption.value);
			setStep(2);
			focusNext();
		},
		[setCategory, setStep, focusNext],
	);

	const handleTagsSelect = useCallback(
		(selectedOptions: { value: string }[]) => {
			setTags(selectedOptions.map((o) => o.value));
			setStep(3);
			focusNext();
		},
		[setTags, setStep, focusNext],
	);

	const handlePromptNameSubmit = useCallback(() => {
		if (promptName.trim().length === 0) {
			setError("Prompt name cannot be empty");
			return;
		}
		setStep(4);
		focusNext();
	}, [promptName, setStep, focusNext]);

	const renderStep = useCallback(() => {
		const StepComponent = stepComponents[step];
		return StepComponent ? (
			<StepComponent
				step={step}
				category={category}
				tags={tags}
				promptName={promptName}
				handleCategorySelect={handleCategorySelect}
				handleTagsSelect={handleTagsSelect}
				handlePromptNameSubmit={handlePromptNameSubmit}
				setPromptName={setPromptName}
			/>
		) : null;
	}, [
		step,
		category,
		tags,
		promptName,
		handleCategorySelect,
		handleTagsSelect,
		handlePromptNameSubmit,
		setPromptName,
	]);

	if (isLoading) return <Text>Loading...</Text>;
	if (error) return <Text color="red">{error}</Text>;

	return (
		<ScreenWrapper title="Test Screen">
			<ErrorBoundary>
				<Box flexDirection="column">
					<Text bold>Welcome to the Test Screen</Text>
					<Text>
						Step {step} of {Object.keys(stepComponents).length}
					</Text>
					{renderStep()}
					<OptionCardGrid
						options={promptCategoryKeys}
						onSelect={handleCategorySelect}
						columns={2}
						itemsPerPage={10}
						isFocused={true}
						multiSelect={false}
					/>
				</Box>
			</ErrorBoundary>
		</ScreenWrapper>
	);
};

export default TestScreen;