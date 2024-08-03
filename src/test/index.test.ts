import { describe, expect, test } from "bun:test";
import * as index from "../index";
import { PromptManager } from "../promptManager";

describe.skip("index", () => {
	test("exports PromptManager", () => {
		expect(index.PromptManager).toBe(PromptManager);
	});

	test("exports generated content", () => {
		expect(index.PromptManager).toBeDefined();
	});
});
