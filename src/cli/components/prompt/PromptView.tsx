import { Box, Text } from "ink";
import { IPrompt } from "../../../types/interfaces";
import React from "react";
import chalk from "chalk";
import yaml from "js-yaml";
import JsonSchemaTree from "../JSONSchemaTree";

const renderSection = (
  title: string,
  content: string | string[] | undefined,
  color: string,
) => (
  <Box flexDirection="row">
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

interface JSONSchemaType {
  type?: string;
  properties?: { [key: string]: JSONSchemaType };
  items?: JSONSchemaType;
  required?: string[];
  description?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  title?: string;
  [key: string]: any; // for any additional properties
}

interface SchemaTreeProps {
  schema: JSONSchemaType | { [key: string]: JSONSchemaType };
  indent?: number;
  isLast?: boolean;
}

interface JsonSchemaTreeProps {
  schema: JSONSchemaType;
}

const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, indent = 0, isLast = true }) => {
  if (typeof schema !== 'object' || schema === null) {
    return <Text>{JSON.stringify(schema)}</Text>;
  }

  const renderField = (key: string, value: JSONSchemaType, isLastField: boolean) => {
    const prefix = ' '.repeat(indent * 2) + (isLast && isLastField ? '\\-' : '|-');
    let description = '';
    let type = value.type || 'object';

    if (value.description) {
      description = ` - ${value.description}`;
    }

    if (value.format) {
      type += `, ${value.format}`;
    }

    if (value.minimum !== undefined) {
      type += `, min: ${value.minimum}`;
    }

    if (value.maximum !== undefined) {
      type += `, max: ${value.maximum}`;
    }

    return (
      <Box key={key} flexDirection="column">
        <Text>
          {prefix} {chalk.cyan(key)} ({type}){description}
        </Text>
        {value.properties && (
          <SchemaTree
            schema={value.properties}
            indent={indent + 1}
            isLast={isLastField}
          />
        )}
        {value.items && (
          <SchemaTree
            schema={value.items}
            indent={indent + 1}
            isLast={isLastField}
          />
        )}
      </Box>
    );
  };

  const fields = Object.entries(schema);

  return (
    <Box flexDirection="column">
      {fields.map(([key, value], index) =>
        renderField(key, value as JSONSchemaType, index === fields.length - 1)
      )}
    </Box>
  );
};

// const JsonSchemaTree: React.FC<JsonSchemaTreeProps> = ({ schema }) => {
//   if (typeof schema !== 'object' || schema === null) {
//     return <Text>Invalid schema: {JSON.stringify(schema)}</Text>;
//   }

//   return (
//     <Box flexDirection="column">
//       <Text>{chalk.bold(schema.title || 'Schema')} ({schema.type || 'object'})</Text>
//       <SchemaTree schema={schema.properties || schema} />
//       {schema.required && schema.required.length > 0 && (
//         <Text>
//           {'\n'}Required: {schema.required.join(', ')}
//         </Text>
//       )}
//     </Box>
//   );
// };


const renderTemplate = (template: string): React.ReactNode => {
  return (
    <Text>
      {template.split(/(\{\{.*?\}\})/).map((part, index) =>
        part.startsWith("{{") && part.endsWith("}}")
          ? chalk.magenta(part)
          : chalk.white(part)
      )}
    </Text>
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
      borderColor="#ffedd5"
      padding={0}
    >
      {/* <Box>
        {JSON.stringify(prompt.inputSchema)}
      </Box> */}
      <Box flexDirection="row" marginBottom={0}>
        <Box width="50%">
          {renderSection("Name", prompt.name, "green")}
        </Box>
        <Box width="50%">
          {renderSection("Category", prompt.category, "green")}
        </Box>
      </Box>
      <Box flexDirection="row" marginBottom={0}>
        <Box width="50%" flexDirection="row">
          {renderSection("Version", prompt.version, "green")}
        </Box>
        <Box width="50%" flexDirection="row">
          {renderSection("Output Type", prompt.outputType, "cyan")}
        </Box>
      </Box>
      {renderSection("Description", prompt.description, "yellow")}
      <Box marginY={1}>
        {/* <Text bold color="magenta">Template:</Text> */}
        {prompt.template && renderTemplate(prompt.template)}
      </Box>
      <Box flexDirection="row" marginY={1}>
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
            {prompt.metadata && renderObject(prompt.metadata)}
          </Box>
          <Box flexDirection="column" marginY={1}>
            <Text bold color="red">Configuration:</Text>
            {prompt.configuration && renderObject(prompt.configuration)}
          </Box>
        </>
      )}
    </Box>
  );
};

export default PromptView;
