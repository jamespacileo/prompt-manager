import type { JSONSchema7 } from "json-schema";
import { z } from "zod";

export function jsonSchemaToZod(schema: JSONSchema7): z.ZodType<any> {
	if (schema.type === "object" && schema.properties) {
		const shape: { [key: string]: z.ZodType<any> } = {};
		for (const [key, prop] of Object.entries(schema.properties)) {
			shape[key] = jsonSchemaToZod(prop as JSONSchema7);
		}
		return z.object(shape);
	}
	if (schema.type === "array" && schema.items) {
		return z.array(jsonSchemaToZod(schema.items as JSONSchema7));
	}
	if (schema.type === "string") {
		return z.string();
	}
	if (schema.type === "number") {
		return z.number();
	}
	if (schema.type === "boolean") {
		return z.boolean();
	}
	if (schema.enum) {
		return z.enum(schema.enum as [string, ...string[]]);
	}

	// Default to any if the type is not recognized
	return z.any();
}
