import { Box, Text, useInput } from "ink";
import React, { useState } from "react";

import TextInput from "ink-text-input";
import { updatePrompt } from "../../commands";

interface PromptEditProps {
  prompt: any;
  onComplete: () => void;
}

const PromptEdit: React.FC<PromptEditProps> = ({ prompt, onComplete }) => {
  const [name, setName] = useState(prompt.name);
  const [category, setCategory] = useState(prompt.category);
  const [description, setDescription] = useState(prompt.description);
  const [template, setTemplate] = useState(prompt.template);
  const [currentField, setCurrentField] = useState("name");

  const handleSubmit = async () => {
    await updatePrompt({
      category: prompt.category,
      name: prompt.name,
      updates: { name, category, description, template },
    });
    onComplete();
  };

  useInput((input, key) => {
    if (input === "s") {
      handleSubmit();
    } else if (key.return) {
      switch (currentField) {
        case "name":
          setCurrentField("category");
          break;
        case "category":
          setCurrentField("description");
          break;
        case "description":
          setCurrentField("template");
          break;
        case "template":
          setCurrentField("name");
          break;
      }
    }
  });

  return (
    <Box flexDirection="column">
      <Text>Edit Prompt</Text>
      <TextInput
        value={name}
        onChange={setName}
        placeholder="Name"
        focus={currentField === "name"}
      />
      <TextInput
        value={category}
        onChange={setCategory}
        placeholder="Category"
        focus={currentField === "category"}
      />
      <TextInput
        value={description}
        onChange={setDescription}
        placeholder="Description"
        focus={currentField === "description"}
      />
      <TextInput
        value={template}
        onChange={setTemplate}
        placeholder="Template"
        focus={currentField === "template"}
      />
      <Text color="green">Press (S) to save changes</Text>
      <Text color="red">Press (Q) to cancel</Text>
    </Box>
  );
};

export default PromptEdit;
