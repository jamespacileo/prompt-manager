import { Box, Text } from "ink";

import { IPrompt } from "../../../types/interfaces";
import React from "react";
import chalk from "chalk";
import yaml from "js-yaml";

const renderSection = (
  title: string,
  content: string | string[] | undefined,
  color: string,
) => (
  <Box flexDirection="column">
    <Text bold color={color}>
      {title}:
    </Text>
    <Box paddingLeft={1}>
      {Array.isArray(content) ? (
        content.map((item, index) => (
          <Text key={index}>{chalk.white(item)}</Text>
        ))
      ) : content ? (
        <Text>{chalk.white(content)}</Text>
      ) : (
        <Text>{chalk.gray("Not specified")}</Text>
      )}
    </Box>
  </Box>
);

const renderObject = (obj: Record<string, any>, indent: number = 1) => (
  <Box flexDirection="column" paddingLeft={indent}>
    {Object.entries(obj).map(([key, value], index) => (
      <Text key={index}>
        {chalk.yellow(key)}:{" "}
        {typeof value === "object"
          ? JSON.stringify(value, null, 2)
              .split("\n")
              .map((line, i) =>
                i === 0 ? line : " ".repeat(indent + key.length + 2) + line,
              )
              .join("\n")
          : chalk.white(JSON.stringify(value))}
      </Text>
    ))}
  </Box>
);

const renderSchema = (schema: Record<string, any>): React.ReactNode => {
  const yamlString = yaml.dump(schema, { indent: 2 });
  return (
    <Box flexDirection="column">
      {yamlString.split("\n").map((line, index) => (
        <Text key={index}>
          {line.startsWith(" ") ? chalk.cyan(line) : chalk.yellow(line)}
        </Text>
      ))}
    </Box>
  );
};

interface PromptViewProps {
  prompt: Partial<IPrompt<any, any>>;
  compact?: boolean;
}

const PromptView: React.FC<PromptViewProps> = ({ prompt, compact = true }) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="blue"
      padding={1}
    >
      <Box flexDirection="column" marginBottom={1}>
        {renderSection("Name", prompt.name, "green")}
        {renderSection("Category", prompt.category, "green")}
        {renderSection("Version", prompt.version, "green")}
        {renderSection("Description", prompt.description, "yellow")}
        {renderSection("Template", prompt.template, "magenta")}
        {/* {renderSection('Parameters', prompt.parameters?.join(', '), 'blue')} */}
        {renderSection("Output Type", prompt.outputType, "cyan")}
        {renderSection(
          "Default Model",
          prompt.defaultModelName || "Not specified",
          "cyan",
        )}
      </Box>
      {!compact && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="red">
            Metadata:
          </Text>
          {prompt.metadata && renderObject(prompt.metadata)}
        </Box>
      )}
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="red">
          Input Schema:
        </Text>
        {prompt.inputSchema && renderSchema(prompt.inputSchema)}
      </Box>
      <Box flexDirection="column" marginBottom={1}>
        <Text bold color="red">
          Output Schema:
        </Text>
        {prompt.outputSchema && renderSchema(prompt.outputSchema)}
      </Box>
      {!compact && (
        <Box flexDirection="column">
          <Text bold color="red">
            Configuration:
          </Text>
          {prompt.configuration && renderObject(prompt.configuration)}
        </Box>
      )}
    </Box>
  );
};

export default PromptView;
