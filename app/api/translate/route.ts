import { z } from "zod";
import { aiAccess, structured } from "@/lib/ai";
import { body, failure, sameOrigin, json, HttpError } from "@/lib/server";
import { inputSchema, validateAlignment } from "@/lib/contracts";
import { splitSentences } from "@/lib/sentences";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await aiAccess();
    const input = await body(req, inputSchema);
    let sentences;
    try {
      sentences = splitSentences(input.text);
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    const schema = z.object({
      translations: z
        .array(
          z.object({ id: z.string(), korean: z.string().min(1).max(16000) }),
        )
        .max(300),
    });
    const response = await structured(
      schema,
      "Translate the provided English academic excerpt faithfully into natural Korean. Use all paragraphs as context. Return exactly one Korean translation per supplied sentence ID, in source order. Preserve citations, numbers, notation, abbreviations, and all content; do not summarize or add explanations. Sentence strings must remain unchanged in the source. Preserve incomplete transcript meaning without inventing content.",
      { sentences },
    );
    let aligned;
    try {
      aligned = validateAlignment(sentences, response.translations);
    } catch (e) {
      throw new HttpError(502, (e as Error).message);
    }
    return json({
      sentences: aligned,
      title: input.title.trim() || "Untitled material",
    });
  } catch (e) {
    return failure(e);
  }
}
