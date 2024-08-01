import React from 'react';
import { Box, Text } from 'ink';
import chalk from 'chalk';
import { JSONSchema7, JSONSchema7TypeName } from 'json-schema';

// interface JSONSchema7 {
//     type?: string | string[];
//     properties?: { [key: string]: JSONSchema7 };
//     items?: JSONSchema7 | boolean;
//     required?: string[];
//     description?: string;
//     enum?: any[];
//     oneOf?: JSONSchema7[];
//     anyOf?: JSONSchema7[];
//     allOf?: JSONSchema7[];
//     [key: string]: any;
// }

interface SchemaTreeProps {
    schema: JSONSchema7;
    name?: string;
    indent?: number;
}

const SchemaTree: React.FC<SchemaTreeProps> = ({ schema, name = 'Schema', indent = 0 }) => {
    const renderField = (key: string, value: JSONSchema7 | boolean) => {
        const type = typeof value === 'boolean' ? (value ? 'any' : 'never') :
            Array.isArray(value.type) ? value.type.join(' | ') :
                value.type || 'any';

        return (
            <Box key={key} flexDirection="column" marginLeft={indent * 2}>
                <Text>
                    {chalk.cyan(key)}: {chalk.yellow(type)}
                    {value && typeof value === 'object' && value.description &&
                        <Text color="gray"> - {value.description}</Text>}
                    {value && typeof value === 'object' && value.enum &&
                        <Text color="gray"> (enum: {value.enum.join(', ')})</Text>}
                </Text>
                {value && typeof value === 'object' && value.properties &&
                    Object.entries(value.properties).map(([propKey, propValue]) =>
                        renderField(propKey, propValue as JSONSchema7)
                    )}
                {value && typeof value === 'object' && value.items &&
                    <SchemaTree schema={value.items as JSONSchema7} name="items" indent={indent + 1} />}
                {/* {value && typeof value === 'object' && (value.oneOf || value.anyOf || value.allOf) &&
                    renderCombiningSchemas(value)} */}
            </Box>
        );
    };

    // const renderCombiningSchemas = (schema: JSONSchema7) => {
    //     const renderSchemas = (schemas: JSONSchema7[], keyword: string) => (
    //         <Box flexDirection="column" marginLeft={2}>
    //             <Text>{keyword}:</Text>
    //             {schemas.map((s, index) => (
    //                 <SchemaTree key={index} schema={s} name={`Option ${index + 1}`} indent={indent + 2} />
    //             ))}
    //         </Box>
    //     );

    //     return (
    //         <Box flexDirection="column">
    //             {schema.oneOf && renderSchemas(schema.oneOf, 'oneOf')}
    //             {schema.anyOf && renderSchemas(schema.anyOf, 'anyOf')}
    //             {schema.allOf && renderSchemas(schema.allOf, 'allOf')}
    //         </Box>
    //     );
    // };

    return (
        <Box flexDirection="column" marginLeft={indent * 2}>
            <Text bold>
                {name} ({schema.type || 'object'})
            </Text>
            {schema.properties &&
                Object.entries(schema.properties).map(([key, value]) =>
                    renderField(key, value as JSONSchema7)
                )}
            {schema.required && schema.required.length > 0 && (
                <Text color="red">
                    Required: {schema.required.join(', ')}
                </Text>
            )}
        </Box>
    );
};

const JsonSchemaTree: React.FC<{ schema: JSONSchema7 }> = ({ schema }) => {
    return (
        <Box flexDirection="column" borderStyle="round" borderColor="green" padding={1}>
            <SchemaTree schema={schema} />
        </Box>
    );
};
export default JsonSchemaTree;