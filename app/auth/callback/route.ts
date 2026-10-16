import { NextResponse } from "next/server";
import { serverClient } from "@/lib/server";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const requested = url.searchParams.get("next");
  const next = requested === "/auth?mode=update" ? requested : "/reading";
  try {
    if (code) {
      const db = await serverClient();
      const { error } = await db.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(next, url.origin));
    }
  } catch {}
  return NextResponse.redirect(new URL("/auth?error=callback", url.origin));
}
