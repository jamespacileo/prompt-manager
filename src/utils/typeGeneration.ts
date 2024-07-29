import { JSONSchema7 } from 'json-schema';
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from 'prettier';

export interface SchemaAndType {
    formattedSchemaTs: string;
    formattedSchemaTsNoImports: string;
}

export async function generateExportableSchemaAndType({ schema, name }: { schema: JSONSchema7, name: string }): Promise<SchemaAndType> {
    // try {
    const zodSchemaString = jsonSchemaToZod(schema, { module: "esm", name: name, type: true });
    const formatted = await format(zodSchemaString, { parser: "typescript" });
    const zodSchemaNoImports = formatted.replace(/import { z } from "zod";/g, "");
    return {
        formattedSchemaTs: zodSchemaNoImports,
        formattedSchemaTsNoImports: zodSchemaNoImports
    };
}
