import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { configured } from "./supabase";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function serverClient() {
  if (!configured())
    throw new HttpError(503, "Supabase 인증·데이터베이스 설정이 필요합니다.");
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Server components cannot mutate cookies. API routes refresh cookies. */
          }
        },
      },
    },
  );
}
export async function requireUser() {
  const db = await serverClient();
  const { data, error } = await db.auth.getUser();
  if (error || !data.user) throw new HttpError(401, "로그인이 필요합니다.");
  return { db, user: data.user };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed =
    process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
  if (origin && origin !== new URL(allowed).origin)
    throw new HttpError(403, "허용되지 않은 요청입니다.");
}
export async function body<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  if (Number(req.headers.get("content-length") || 0) > 200000)
    throw new HttpError(413, "요청이 너무 큽니다.");
  // A bounded stream also protects chunked requests with no Content-Length.
  const reader = req.body?.getReader();
  if (!reader) throw new HttpError(400, "요청 내용이 없습니다.");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 200000) {
      await reader.cancel();
      throw new HttpError(413, "요청이 너무 큽니다.");
    }
    chunks.push(value);
  }
  const buffer = Buffer.concat(chunks);
  let json: unknown;
  try {
    json = JSON.parse(buffer.toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON 요청 형식이 잘못되었습니다.");
  }
  return schema.parse(json);
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  if (error instanceof z.ZodError)
    return NextResponse.json(
      { error: "입력 또는 응답 형식이 유효하지 않습니다." },
      { status: 400 },
    );
  // Never log provider payloads, academic texts, tokens, or raw service errors.
  return NextResponse.json(
    {
      error:
        "요청을 완료하지 못했습니다. 설정과 연결을 확인하고 다시 시도해 주세요.",
    },
    { status: 502 },
  );
}
export const json = (data: unknown) =>
  NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
