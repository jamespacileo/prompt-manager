type PromptCategory = {
    label: string;
    description: string;
};

const promptCategories: PromptCategory[] = [
    {
        label: "Text Generation",
        description: "Creating various types of content, from creative writing to technical documentation."
    },
    {
        label: "Analysis & Insights",
        description: "Extracting meaning, summarizing, or providing analytical outputs from text or data."
    },
    {
        label: "Question Answering",
        description: "Providing answers to direct questions based on context or general knowledge."
    },
    {
        label: "Data Processing",
        description: "Manipulating, cleaning, and transforming data from various sources."
    },
    {
        label: "Language Translation",
        description: "Converting text from one language to another while maintaining context and meaning."
    },
    {
        label: "Code & Programming",
        description: "Generating code snippets, debugging, and explaining programming concepts."
    },
    {
        label: "Creative Writing",
        description: "Producing stories, poetry, and other forms of creative text."
    },
    {
        label: "Task Planning & Management",
        description: "Breaking down complex tasks or creating action plans for various projects."
    },
    {
        label: "Conversation & Dialogue",
        description: "Managing and maintaining coherent conversations over multiple turns, including chatbot interactions."
    },
    {
        label: "Educational & Explanatory",
        description: "Teaching concepts or explaining complex ideas in an understandable manner."
    },
    {
        label: "Problem Solving",
        description: "Applying logical reasoning and step-by-step problem resolution techniques."
    },
    {
        label: "Personalization & Customization",
        description: "Tailoring content or responses to specific users or contexts."
    },
    {
        label: "Fact-Checking & Verification",
        description: "Verifying information or cross-referencing facts from various sources."
    },
    {
        label: "Sentiment & Emotion Analysis",
        description: "Determining the emotional tone of text (positive, negative, neutral) and extracting sentiment."
    },
    {
        label: "Summarization",
        description: "Condensing longer texts into shorter summaries for quick understanding."
    },
    {
        label: "Research & Information Gathering",
        description: "Collecting and organizing information on specific topics from various sources."
    },
    {
        label: "Decision Support",
        description: "Assisting in making choices or providing recommendations based on given criteria."
    },
    {
        label: "Style & Tone Adjustment",
        description: "Modifying the style or tone of existing content to suit different audiences or purposes."
    },
    {
        label: "Proofreading & Editing",
        description: "Correcting grammar, improving style, and refining content for better quality."
    },
    {
        label: "Scenario Generation",
        description: "Creating hypothetical situations or test cases for various applications."
    },
    {
        label: "Basic Conversation",
        description: "Handling everyday small talk, greetings, and casual conversation starters."
    },
    {
        label: "Information Retrieval",
        description: "Performing queries for factual information, data lookups, and general knowledge questions."
    },
    {
        label: "Text Classification",
        description: "Categorizing text into predefined labels, such as topics or sentiment classes."
    },
    {
        label: "Named Entity Recognition",
        description: "Identifying and classifying entities (e.g., names, places, organizations) within text."
    },
    {
        label: "Content Moderation",
        description: "Detecting and flagging inappropriate or harmful content in text or media."
    },
    {
        label: "Knowledge Base Creation",
        description: "Compiling information into structured formats, like FAQs or databases."
    },
    {
        label: "Form Filling Automation",
        description: "Automatically completing forms based on user data or given information."
    },
    {
        label: "Text-based Calculations",
        description: "Performing calculations and numerical reasoning from text inputs."
    },
    {
        label: "Legal Document Analysis",
        description: "Analyzing, summarizing, and extracting key information from legal documents."
    },
    {
        label: "Medical Diagnosis Assistance",
        description: "Providing preliminary diagnoses or health advice based on described symptoms."
    },
    {
        label: "Image Description",
        description: "Generating textual descriptions of images for accessibility purposes."
    },
    {
        label: "Event Extraction",
        description: "Identifying events and their details from text or unstructured data."
    },
    {
        label: "Trend Analysis",
        description: "Identifying and analyzing trends from textual or numerical data."
    },
    {
        label: "Speech-to-Text and Text-to-Speech",
        description: "Converting spoken words to text and vice versa for various applications."
    },
    {
        label: "Opinion Mining",
        description: "Extracting opinions and subjective information from text data."
    },
    {
        label: "Contextual Understanding",
        description: "Comprehending the context of a given text to provide relevant and accurate responses."
    },
    {
        label: "Multimodal Integration",
        description: "Combining text with other data types (e.g., images, audio) for comprehensive analysis."
    },
    {
        label: "User Intent Recognition",
        description: "Understanding and categorizing the user's intent behind queries or commands."
    },
    {
        label: "Adaptive Learning",
        description: "Learning from interactions and adapting to user preferences over time."
    },
    {
        label: "Retrieval-Augmented Generation (RAG)",
        description: "Integrating retrieval mechanisms to enhance the generation of responses by fetching relevant information from external sources."
    },
    {
        label: "Self-Reflection & Improvement",
        description: "Enabling models to reflect on their responses and improve based on feedback or self-assessment."
    },
    {
        label: "Interactive Storytelling",
        description: "Creating dynamic and interactive narratives that evolve based on user input."
    },
    {
        label: "Ethical & Bias Mitigation",
        description: "Ensuring responses adhere to ethical guidelines and actively mitigating biases in generated content."
    },
    {
        label: "User Feedback Integration",
        description: "Incorporating user feedback to refine and improve future responses."
    },
    {
        label: "Contextual Memory Management",
        description: "Managing and utilizing long-term context across multiple interactions to maintain coherence and relevance."
    },
    {
        label: "Safety & Compliance",
        description: "Ensuring generated content complies with safety standards and regulatory requirements."
    },
    {
        label: "Multilingual Support",
        description: "Providing support for multiple languages and ensuring accurate translations and context preservation."
    },
    {
        label: "Scenario Simulation",
        description: "Simulating various scenarios for training, testing, or entertainment purposes."
    },
    {
        label: "Personal Assistant",
        description: "Acting as a personal assistant to manage schedules, reminders, and other personal tasks."
    }
];

function toCamelCase(str: string): string {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (match, chr) => chr.toUpperCase())
        .replace(/^(.)/, (match) => match.toUpperCase());
}

const promptCategoryKeys = promptCategories.map(category => ({
    ...category,
    value: toCamelCase(category.label)
}));

export default promptCategories;
export { promptCategoryKeys };