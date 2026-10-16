import { describe, it, expect } from "vitest";
import { splitSentences } from "@/lib/sentences";
import {
  validateAlignment,
  saveSchema,
  filterEntries,
  normalizeExpression,
  inputSchema,
} from "@/lib/contracts";
import { toRecord } from "@/lib/entries";
import { demoSentences, demoDetail } from "@/lib/demo";
const input = {
  ...demoDetail("significant"),
  sentence: demoSentences[0],
  title: "Statistics",
};
describe("alignment and source preservation", () => {
  it("preserves exact English, abbreviations, decimals and paragraph order", () => {
    const text =
      "Dr. Kim reports a value of 0.05, e.g. in Fig. 2. Another sentence.\n\nNo punctuation here";
    const result = splitSentences(text);
    expect(result.map((s) => s.english).join("")).toBe(
      text.replace("\n\n", ""),
    );
    expect(result[0].english).toBe(
      "Dr. Kim reports a value of 0.05, e.g. in Fig. 2. ",
    );
    expect(result.at(-1)?.paragraph).toBe(1);
    expect(splitSentences(text)).toEqual(result);
  });
  it("maps IDs rather than relying on returned ordering", () => {
    const sentences = splitSentences("One. Two.");
    const result = validateAlignment(sentences, [
      { id: sentences[1].id, korean: "둘." },
      { id: sentences[0].id, korean: "하나." },
    ]);
    expect(result[0].korean).toBe("하나.");
    expect(result[1].korean).toBe("둘.");
  });
  it("rejects missing, duplicate, unknown and empty translations", () => {
    const s = splitSentences("One. Two.");
    for (const t of [
      [],
      [
        { id: s[0].id, korean: "1" },
        { id: s[0].id, korean: "2" },
      ],
      [
        { id: s[0].id, korean: "1" },
        { id: "unknown", korean: "2" },
      ],
      [
        { id: s[0].id, korean: " " },
        { id: s[1].id, korean: "2" },
      ],
    ])
      expect(() => validateAlignment(s, t)).toThrow();
  });
  it("enforces the server excerpt limit", () => {
    expect(inputSchema.safeParse({ text: "a".repeat(12001) }).success).toBe(
      false,
    );
    expect(() => splitSentences("")).toThrow();
  });
});
describe("vocabulary contracts", () => {
  it("requires all saved fields and exactly two examples", () => {
    expect(saveSchema.safeParse(input).success).toBe(true);
    expect(saveSchema.safeParse({ ...input, examples: [] }).success).toBe(
      false,
    );
    expect(saveSchema.safeParse({ ...input, sentence: {} }).success).toBe(
      false,
    );
    expect(
      saveSchema.safeParse({ ...input, expression: "not present" }).success,
    ).toBe(false);
  });
  it("associates owner from trusted server auth and leaves timestamp to DB", () => {
    const record = toRecord(
      { ...input, user_id: "attacker" } as typeof input,
      "authenticated-owner",
    );
    expect(record.user_id).toBe("authenticated-owner");
    expect(record).not.toHaveProperty("created_at");
    expect(record.source_sentence).toBe(input.sentence.english);
    expect(record.examples).toEqual(input.examples);
    expect(record.material_title).toBe("Statistics");
  });
  it("normalizes duplicate comparison and searches all required fields", () => {
    expect(normalizeExpression("  Significant ")).toBe("significant");
    const entry = { ...input, id: "1", created_at: "2026-01-01" };
    for (const q of ["SIGNIFICANT", "통계", "statistics"])
      expect(filterEntries([entry], q)).toHaveLength(1);
    expect(filterEntries([entry], "unknown")).toHaveLength(0);
  });
});
