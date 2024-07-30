

export const writinggeneratePromptInput = z.object({
  themes: z.string().optional(),
  setting: z.string().optional(),
  main_character: z.string().optional(),
  conflict: z.string().optional(),
});
export type WritinggeneratePromptInput = z.infer<
  typeof writinggeneratePromptInput
>;
