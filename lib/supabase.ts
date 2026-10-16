import { createBrowserClient } from "@supabase/ssr";
export function configured() {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
export function browserClient() {
  if (!configured())
    throw new Error(
      "Supabase 설정이 필요합니다. README의 인증 설정을 확인해 주세요.",
    );
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
