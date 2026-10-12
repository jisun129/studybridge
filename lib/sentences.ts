import { MAX_TEXT, type Sentence } from "./contracts";
/** Segment a masked copy but slice the exact original; abbreviations/decimal notation survive. */
export function splitSentences(text: string): Omit<Sentence, "korean">[] {
  if (!text.trim() || text.length > MAX_TEXT)
    throw new Error("본문은 1–12,000자여야 합니다.");
  const paragraphs = text.split(/\n[\t ]*\n/).filter((p) => p.trim());
  const results: Omit<Sentence, "korean">[] = [];
  paragraphs.forEach((original, paragraph) => {
    const mask = original.replace(
      /\b(?:e\.g\.|i\.e\.|et al\.|Dr\.|Mr\.|Mrs\.|Ms\.|Prof\.|Fig\.|Eq\.|Ref\.|vs\.|No\.|al\.)|\b(?:[A-Z]\.){2,}|(?<=\d)\.(?=\d)/gi,
      (s) => s.replace(/\./g, "x"),
    );
    const segments = new Intl.Segmenter("en", {
      granularity: "sentence",
    }).segment(mask);
    for (const seg of segments) {
      const english = original.slice(seg.index, seg.index + seg.segment.length);
      if (english.trim())
        results.push({
          id: `p${paragraph}-s${results.length}`,
          paragraph,
          english,
        });
    }
  });
  if (results.length > 300)
    throw new Error(
      "최대 300문장까지 처리할 수 있습니다. 발췌문을 줄여 주세요.",
    );
  return results;
}
export function selectedExpression(
  selection: Selection | null,
): { expression: string; sentenceId: string } | null {
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const element = (node: Node | null) =>
    node instanceof Element ? node : node?.parentElement;
  const start = element(selection.anchorNode)?.closest<HTMLElement>(
    "[data-source-id]",
  );
  const end = element(selection.focusNode)?.closest<HTMLElement>(
    "[data-source-id]",
  );
  if (!start || !end) return null;
  if (start !== end)
    throw new Error("표현은 한 영어 문장 안에서 선택해 주세요.");
  const expression = selection.toString().trim();
  if (!expression) return null;
  if (expression.length > 200)
    throw new Error("200자 이하의 단어나 구를 선택해 주세요.");
  return { expression, sentenceId: start.dataset.sourceId! };
}
