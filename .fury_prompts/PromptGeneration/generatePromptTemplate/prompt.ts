

export const PromptGenerationgeneratePromptTemplateInput = z.object({
  instruction: z.string().optional(),
  expectedOutput: z.string().optional(),
  context: z.string().optional(),
});
export type PromptGenerationgeneratePromptTemplateInput = z.infer<
  typeof PromptGenerationgeneratePromptTemplateInput
>;
