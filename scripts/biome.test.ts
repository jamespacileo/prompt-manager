import { expect, test, describe } from "bun:test";
import {
	parseBiomeOutput,
	type FileErrors,
} from "./generateTsProjectDocAndQualityReport";

describe("parseBiomeOutput", () => {
	test("should parse a single file with one error", () => {
		const input = `
./src/example.ts:10:15 lint/style/useConst ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Variable 'x' is never reassigned. Use 'const' instead.
    
     8 │ function example() {
     9 │   // This variable should be const
  > 10 │   let x = 5;
       │       ^
    11 │   console.log(x);
    12 │ }
    
  i Suggested fix: Replace 'let' with 'const'.
    
     8  │ function example() {
     9  │   // This variable should be const
    10  │   const x = 5;
        │   +++++
    11  │   console.log(x);
    12  │ }
    
`;

		const expected: FileErrors = {
			"./src/example.ts": [
				{
					line: 10,
					column: 15,
					message:
						"lint/style/useConst - Variable 'x' is never reassigned. Use 'const' instead.",
				},
			],
		};

		expect(parseBiomeOutput(input)).toEqual(expected);
	});

	test("should parse multiple files with multiple errors", () => {
		const input = `
./src/file1.ts:5:10 lint/style/useConst ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Variable 'y' is never reassigned. Use 'const' instead.
    
    3 │ function example1() {
    4 │   // This variable should be const
  > 5 │   let y = 10;
      │       ^
    6 │   console.log(y);
    7 │ }
    
  i Suggested fix: Replace 'let' with 'const'.
    
    3  │ function example1() {
    4  │   // This variable should be const
    5  │   const y = 10;
       │   +++++
    6  │   console.log(y);
    7  │ }
    

./src/file2.ts:8:3 lint/correctness/noUnreachable ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × This code will never be reached.
    
    6 │ function example2(x: number) {
    7 │   return x * 2;
  > 8 │   console.log("This will never be reached");
      │   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
    9 │ }
    
  i Removing the unreachable code will make your code shorter and easier to maintain.

./src/file2.ts:15:5 lint/suspicious/noRedundantUseStrict ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Redundant 'use strict' directive.
    
    13 │ 
    14 │ function example3() {
  > 15 │     "use strict";
       │     ^^^^^^^^^^^^^
    16 │     console.log("Hello, world!");
    17 │ }
    
  i 'use strict' is unnecessary inside ES modules.

`;

		const expected: FileErrors = {
			"./src/file1.ts": [
				{
					line: 5,
					column: 10,
					message:
						"lint/style/useConst - Variable 'y' is never reassigned. Use 'const' instead.",
				},
			],
			"./src/file2.ts": [
				{
					line: 8,
					column: 3,
					message:
						"lint/correctness/noUnreachable - This code will never be reached.",
				},
				{
					line: 15,
					column: 5,
					message:
						"lint/suspicious/noRedundantUseStrict - Redundant 'use strict' directive.",
				},
			],
		};

		expect(parseBiomeOutput(input)).toEqual(expected);
	});

	test("should handle empty input", () => {
		expect(parseBiomeOutput("")).toEqual({});
	});

	test("should handle input with no errors", () => {
		const input = `
Checked 10 files
No errors found.
`;
		expect(parseBiomeOutput(input)).toEqual({});
	});

	test("should handle malformed input", () => {
		const input = `
This is not a valid Biome error output.
It should not crash the parser.
`;
		expect(parseBiomeOutput(input)).toEqual({});
	});

	test("should parse errors with multiline messages", () => {
		const input = `
./src/complex.ts:20:3 lint/complexity/noExtraBooleanCast ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  × Redundant double negation.
    
    18 │ function complexExample(value: any) {
    19 │   // This is a complex error with a multiline message
  > 20 │   if (!!value) {
       │      ^^
    21 │     console.log("Value is truthy");
    22 │   }
    
  i Suggested fix: Remove the double negation.
    
    18  │ function complexExample(value: any) {
    19  │   // This is a complex error with a multiline message
    20  │   if (value) {
        │      ^^^^^
    21  │     console.log("Value is truthy");
    22  │   }
    
  i The double negation is unnecessary and can be removed without changing the behavior.
    It's generally used to coerce a value to boolean, but this can be done more clearly
    with the Boolean function or by using the value directly in a boolean context.

`;

		const expected: FileErrors = {
			"./src/complex.ts": [
				{
					line: 20,
					column: 3,
					message:
						"lint/complexity/noExtraBooleanCast - Redundant double negation.",
				},
			],
		};

		expect(parseBiomeOutput(input)).toEqual(expected);
	});
});