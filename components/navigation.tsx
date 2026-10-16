"use client";
import Link from "next/link";
import { useState } from "react";
import { browserClient, configured } from "@/lib/supabase";
export default function Navigation() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <header>
      <nav aria-label="주 메뉴">
        <Link className="brand" href="/">
          StudyBridge<span className="muted"> · 학습의 다리</span>
        </Link>
        <Link href="/reading">읽기</Link>
        <Link href="/vocabulary">내 어휘</Link>
        <button
          className="secondary"
          disabled={busy}
          onClick={async () => {
            if (!configured()) {
              location.href = "/auth";
              return;
            }
            setBusy(true);
            const { error } = await browserClient().auth.signOut();
            if (error) {
              setError("로그아웃하지 못했습니다. 다시 시도해 주세요.");
              setBusy(false);
            } else location.href = "/auth";
          }}
        >
          {busy ? "처리 중…" : "로그아웃"}
        </button>
      </nav>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </header>
  );
}
