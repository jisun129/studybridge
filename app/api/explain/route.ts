import { aiAccess, structured } from "@/lib/ai";
import { body, failure, sameOrigin, json } from "@/lib/server";
import { explainInputSchema, detailSchema } from "@/lib/contracts";
export const runtime = "nodejs";
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    await aiAccess();
    const input = await body(req, explainInputSchema);
    const result = await structured(
      detailSchema,
      "Explain the selected English word or phrase in Korean using the given academic sentence and surrounding context. Provide its contextual Korean meaning, brief Korean usage or grammar explanation, and general meaning only if different/useful (otherwise empty string). Reflect domain-specific senses, including statistical significance. Generate exactly two additional English examples with Korean translations; these are examples, not quotations. Return expression exactly as selected.",
      input,
    );
    return json({ ...result, expression: input.expression });
  } catch (e) {
    return failure(e);
  }
}
