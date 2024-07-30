

export const TextProcessingextractGlossaryWordsInput = z.object({
  text: z.string().optional(),
});
export type TextProcessingextractGlossaryWordsInput = z.infer<
  typeof TextProcessingextractGlossaryWordsInput
>;
