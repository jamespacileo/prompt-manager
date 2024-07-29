import { expect, test, describe } from "bun:test";
import { generateExportableSchemaAndType } from "./typeGeneration";
import { JSONSchema7 } from "json-schema";

describe("Type Generation Utilities", () => {
    const sampleSchema: JSONSchema7 = {
        type: "object",
        properties: {
            name: { type: "string" },
            age: { type: "number" },
            isStudent: { type: "boolean" }
        },
        required: ["name", "age"]
    };

    test("generateExportableSchemaAndType", async () => {
        const result = await generateExportableSchemaAndType({ schema: sampleSchema, name: "Person" });
        expect(result.formattedSchemaTs).toContain("export const Person = z.object({");
        expect(result.formattedSchemaTs).toContain("name: z.string(),");
        expect(result.formattedSchemaTs).toContain("age: z.number(),");
        expect(result.formattedSchemaTs).toContain("isStudent: z.boolean().optional(),");
        expect(result.formattedSchemaTs).toContain("export type Person = z.infer<typeof Person>;");
        expect(result).toMatchSnapshot();
    });
});