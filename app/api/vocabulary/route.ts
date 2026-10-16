import { createHash } from "node:crypto";
import {
  requireUser,
  body,
  failure,
  sameOrigin,
  json,
  HttpError,
} from "@/lib/server";
import { saveSchema, normalizeExpression } from "@/lib/contracts";
import { toRecord, fromRecord } from "@/lib/entries";
export async function GET() {
  try {
    const { db, user } = await requireUser();
    const entries = [];
    const pageSize = 500;
    // Supabase caps individual responses; fetch every page for complete search/export.
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error) throw error;
      entries.push(...data.map(fromRecord));
      if (data.length < pageSize) break;
    }
    return json({ entries });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    sameOrigin(req);
    const { db, user } = await requireUser();
    const input = await body(req, saveSchema);
    const { data, error } = await db
      .from("vocabulary")
      .insert(toRecord(input, user.id))
      .select("*")
      .single();
    if (error?.code === "23505") {
      const existing = await db
        .from("vocabulary")
        .select("*")
        .eq("user_id", user.id)
        .eq("normalized_expression", normalizeExpression(input.expression))
        .eq(
          "source_hash",
          createHash("sha256").update(input.sentence.english).digest("hex"),
        )
        .single();
      if (existing.error) throw existing.error;
      return json({ entry: fromRecord(existing.data), duplicate: true });
    }
    if (error || !data)
      throw new HttpError(
        502,
        "저장하지 못했습니다. 설명을 유지했으니 다시 시도해 주세요.",
      );
    return json({ entry: fromRecord(data), duplicate: false });
  } catch (e) {
    return failure(e);
  }
}
