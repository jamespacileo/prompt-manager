import { JSONSchema7 } from 'json-schema';
import { jsonSchemaToZod } from "json-schema-to-zod";
import { format } from 'prettier';
import jsf from 'json-schema-faker';

export interface SchemaAndType {
    formattedSchemaTs: string;
    formattedSchemaTsNoImports: string;
}

export async function generateExportableSchemaAndType({ schema, name }: { schema: JSONSchema7, name: string }): Promise<SchemaAndType> {
    const zodSchemaString = jsonSchemaToZod(schema, { module: "esm", name: name, type: true });
    const formatted = await format(zodSchemaString, { parser: "typescript" });
    const zodSchemaNoImports = formatted.replace(/import { z } from "zod";/g, "");
    return {
        formattedSchemaTs: zodSchemaNoImports,
        formattedSchemaTsNoImports: zodSchemaNoImports
    };
}

export function generateTestInputs(schema: JSONSchema7, count: number = 5): any[] {
    jsf.option({
        alwaysFakeOptionals: true,
        useDefaultValue: true,
    });
    
    const testInputs = [];
    for (let i = 0; i < count; i++) {
        testInputs.push(jsf.generate(schema));
    }
    return testInputs;
}
