import { z } from "zod";
export const MAX_TEXT = 12_000;
export const inputSchema = z.object({
  text: z
    .string()
    .min(1)
    .max(MAX_TEXT)
    .refine((t) => !!t.trim(), "영어 본문을 입력해 주세요."),
  title: z.string().max(200).default("Untitled material"),
});
export const sentenceSchema = z.object({
  id: z.string().min(1).max(80),
  paragraph: z.number().int().nonnegative(),
  english: z.string().min(1).max(MAX_TEXT),
  korean: z.string().min(1).max(16000),
});
export const exampleSchema = z.object({
  english: z.string().min(1).max(1000),
  korean: z.string().min(1).max(1500),
});
export const detailSchema = z.object({
  expression: z.string().trim().min(1).max(200),
  meaning: z.string().min(1).max(1000),
  usage: z.string().min(1).max(2000),
  generalMeaning: z.string().max(1000),
  examples: z.array(exampleSchema).length(2),
});
export const explainInputSchema = z
  .object({
    expression: z.string().trim().min(1).max(200),
    sentence: sentenceSchema,
    context: z.string().max(MAX_TEXT),
  })
  .superRefine((v, ctx) => {
    if (!v.sentence.english.toLowerCase().includes(v.expression.toLowerCase()))
      ctx.addIssue({
        code: "custom",
        message: "선택한 표현이 원문에 없습니다.",
      });
  });
export const saveSchema = detailSchema
  .extend({
    sentence: sentenceSchema,
    title: z.string().trim().min(1).max(200),
  })
  .superRefine((v, ctx) => {
    if (!v.sentence.english.toLowerCase().includes(v.expression.toLowerCase()))
      ctx.addIssue({ code: "custom", message: "표현이 원문에 없습니다." });
  });
export type Sentence = z.infer<typeof sentenceSchema>;
export type Detail = z.infer<typeof detailSchema>;
export type SaveInput = z.infer<typeof saveSchema>;
export type Entry = SaveInput & { id: string; created_at: string };
export const normalizeExpression = (s: string) => s.trim().toLowerCase();
export function filterEntries(entries: Entry[], query: string) {
  const q = query.trim().toLocaleLowerCase();
  return entries.filter((e) =>
    [e.expression, e.meaning, e.title].some((s) =>
      s.toLocaleLowerCase().includes(q),
    ),
  );
}
export function validateAlignment(
  sentences: Omit<Sentence, "korean">[],
  translated: { id: string; korean: string }[],
) {
  if (
    translated.length !== sentences.length ||
    new Set(translated.map((t) => t.id)).size !== sentences.length
  )
    throw new Error(
      "번역 문장 수 또는 ID가 일치하지 않습니다. 다시 시도해 주세요.",
    );
  const map = new Map(translated.map((t) => [t.id, t.korean]));
  return sentences.map((s) => {
    const korean = map.get(s.id);
    if (!korean?.trim())
      throw new Error("누락된 문장 번역이 있습니다. 다시 시도해 주세요.");
    return { ...s, korean };
  });
}
