

export const PromptCreationGeneratePromptInput = z.object({
  description: z.string().optional(),
});
export type PromptCreationGeneratePromptInput = z.infer<
  typeof PromptCreationGeneratePromptInput
>;
