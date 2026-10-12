import type { Sentence, Detail, Entry, SaveInput } from "./contracts";
import { normalizeExpression } from "./contracts";
export const demoSentences: Sentence[] = [
  {
    id: "p0-s0",
    paragraph: 0,
    english:
      "The result is statistically significant, conditional on the assumptions of the model.",
    korean:
      "이 결과는 모형의 가정이 충족된다는 조건하에서 통계적으로 유의하다.",
  },
  {
    id: "p0-s1",
    paragraph: 0,
    english:
      "However, a small p-value does not account for the magnitude of the effect.",
    korean: "그러나 작은 p값은 효과의 크기를 고려하지 않는다.",
  },
  {
    id: "p1-s2",
    paragraph: 1,
    english:
      "Researchers should report confidence intervals alongside point estimates.",
    korean: "연구자는 점 추정값과 함께 신뢰 구간을 보고해야 한다.",
  },
];
export function demoDetail(expression: string): Detail {
  return {
    expression,
    meaning: "샘플 설명: 이 문맥에서의 통계적·학술적 의미",
    usage: "미리 작성한 시연용 설명입니다. 실제 AI 설명이 아닙니다.",
    generalMeaning: "",
    examples: [
      {
        english: "The result was statistically significant.",
        korean: "결과는 통계적으로 유의했다.",
      },
      {
        english: "The estimate is conditional on the model assumptions.",
        korean: "이 추정은 모형의 가정이 충족된다는 조건하에 성립한다.",
      },
    ],
  };
}
let entries: Entry[] = [];
export function demoEntries() {
  return [...entries];
}
export function demoSave(input: SaveInput) {
  const existing = entries.find(
    (e) =>
      normalizeExpression(e.expression) ===
        normalizeExpression(input.expression) &&
      e.sentence.english === input.sentence.english,
  );
  if (existing) return { entry: existing, duplicate: true };
  const entry = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  entries.unshift(entry);
  return { entry, duplicate: false };
}
export function demoDelete(id: string) {
  entries = entries.filter((e) => e.id !== id);
}
