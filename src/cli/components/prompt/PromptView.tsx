import { Box, Text, BoxProps } from "ink";
import { IPrompt } from "../../../types/interfaces";
import React from "react";
import chalk from "chalk";
import yaml from "js-yaml";
import JsonSchemaTree from "../JSONSchemaTree";

interface RenderSectionProps extends BoxProps {
  title: string;
  content: string | string[] | undefined;
  color: string;
  showTitle?: boolean;
}

const RenderSection: React.FC<RenderSectionProps> = ({
  title,
  content,
  color,
  showTitle = true,
  flexDirection = "row",
  ...boxProps
}) => (
  <Box flexDirection={flexDirection} {...boxProps}>
    {showTitle && (
      <Text bold color={color}>
        {title}:
      </Text>
    )}
    <Box paddingLeft={showTitle ? 1 : 0}>
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

interface RenderObjectProps extends BoxProps {
  obj: Record<string, any>;
  indent?: number;
}

const RenderObject: React.FC<RenderObjectProps> = ({ obj, indent = 1, ...boxProps }) => (
  <Box flexDirection="column" paddingLeft={indent} {...boxProps}>
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

interface RenderSchemaProps extends BoxProps {
  schema: Record<string, any>;
}

const RenderSchema: React.FC<RenderSchemaProps> = ({ schema, ...boxProps }) => {
  const yamlString = yaml.dump(schema, { indent: 2 });
  return (
    <Box flexDirection="column" {...boxProps}>
      {yamlString.split("\n").map((line, index) => (
        <Text key={index}>
          {line.startsWith(" ") ? chalk.cyan(line) : chalk.yellow(line)}
        </Text>
      ))}
    </Box>
  );
};

interface RenderTemplateProps extends BoxProps {
  template: string;
}

const RenderTemplate: React.FC<RenderTemplateProps> = ({ template, ...boxProps }) => (
  <Box {...boxProps}>
    <Text>
      {template.split(/(\{\{.*?\}\})/).map((part, index) =>
        part.startsWith("{{") && part.endsWith("}}")
          ? chalk.magenta(part)
          : chalk.white(part)
      )}
    </Text>
  </Box>
);

interface PromptViewProps {
  prompt: Partial<IPrompt<any, any>>;
  compact?: boolean;
}

const PromptView: React.FC<PromptViewProps> = ({ prompt, compact = true }) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor="#ffedd5"
      padding={0}
    >
      <Box flexDirection="row" marginBottom={0}>
        <Box width="50%">
          <RenderSection title="Name" content={prompt.name} color="green" />
        </Box>
        <Box width="50%">
          <RenderSection title="Category" content={prompt.category} color="green" />
        </Box>
      </Box>
      <Box flexDirection="row" marginBottom={0}>
        <Box width="50%" flexDirection="row">
          <RenderSection title="Ver" content={prompt.version} color="green" />
        </Box>
        <Box width="50%" flexDirection="row">
          <RenderSection title="Output Type" content={prompt.outputType} color="cyan" />
        </Box>
      </Box>
      <RenderSection title="Description" showTitle={false} flexDirection="column" content={prompt.description} color="yellow" paddingLeft={0} paddingBottom={1} />

      <Box marginY={0} borderStyle="round" borderColor="#ffedd5" paddingX={1}>
        {prompt.template && <RenderTemplate template={prompt.template} />}
      </Box>
      <Box flexDirection="row" marginY={0} paddingX={1}>
        <Box width="50%" flexDirection="column" marginRight={1}>
          <Text bold color="red">Input Schema:</Text>
          {prompt.inputSchema && <JsonSchemaTree schema={prompt.inputSchema} />}
        </Box>
        <Box width="50%" flexDirection="column" marginLeft={1}>
          <Text bold color="red">Output Schema:</Text>
          {prompt.outputSchema && <JsonSchemaTree schema={prompt.outputSchema} />}
        </Box>
      </Box>
      {!compact && (
        <>
          <Box flexDirection="column" marginY={1}>
            <Text bold color="red">Metadata:</Text>
            {prompt.metadata && <RenderObject obj={prompt.metadata} />}
          </Box>
          <Box flexDirection="column" marginY={1}>
            <Text bold color="red">Configuration:</Text>
            {prompt.configuration && <RenderObject obj={prompt.configuration} />}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PromptView;