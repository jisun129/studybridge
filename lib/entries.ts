import type { Entry, SaveInput } from "./contracts";
export function toRecord(input: SaveInput, userId: string) {
  return {
    user_id: userId,
    expression: input.expression,
    meaning: input.meaning,
    usage: input.usage,
    general_meaning: input.generalMeaning,
    examples: input.examples,
    source_sentence: input.sentence.english,
    source_translation: input.sentence.korean,
    material_title: input.title,
  };
}
export function fromRecord(row: Record<string, unknown>): Entry {
  return {
    id: row.id as string,
    created_at: row.created_at as string,
    expression: row.expression as string,
    meaning: row.meaning as string,
    usage: row.usage as string,
    generalMeaning: row.general_meaning as string,
    examples: row.examples as Entry["examples"],
    title: row.material_title as string,
    sentence: {
      id: row.id as string,
      paragraph: 0,
      english: row.source_sentence as string,
      korean: row.source_translation as string,
    },
  };
}
