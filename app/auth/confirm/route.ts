import { NextResponse } from "next/server";
import { serverClient } from "@/lib/server";
import type { EmailOtpType } from "@supabase/supabase-js";
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");
  try {
    if (token_hash && ["signup", "recovery", "email"].includes(type || "")) {
      const db = await serverClient();
      const { error } = await db.auth.verifyOtp({
        token_hash,
        type: type as EmailOtpType,
      });
      if (!error)
        return NextResponse.redirect(
          new URL(
            type === "recovery" ? "/auth?mode=update" : "/reading",
            url.origin,
          ),
        );
    }
  } catch {}
  return NextResponse.redirect(new URL("/auth?error=confirmation", url.origin));
}
