"use client";
import { useState, useEffect } from "react";
import { browserClient, configured } from "@/lib/supabase";
type Mode = "signin" | "signup" | "reset" | "update";
export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "update") setMode("update");
    if (params.get("error"))
      setError("인증 링크가 만료되었거나 잘못되었습니다. 다시 요청해 주세요.");
  }, []);
  const names: Record<Mode, string> = {
    signin: "로그인",
    signup: "회원가입",
    reset: "비밀번호 재설정 메일 보내기",
    update: "새 비밀번호 저장",
  };
  return (
    <section className="auth card">
      <p className="eyebrow">YOUR PERSONAL READING SPACE</p>
      <h1>{names[mode]}</h1>
      {!configured() && (
        <p className="error" role="alert">
          Supabase 설정이 필요합니다. .env.example과 README의 설정 안내를 확인해
          주세요.
        </p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setMessage("");
          try {
            const db = browserClient();
            const origin = location.origin;
            if (mode === "signin") {
              const { error } = await db.auth.signInWithPassword({
                email,
                password,
              });
              if (error) throw error;
              location.href = "/reading";
            }
            if (mode === "signup") {
              const { data, error } = await db.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: `${origin}/auth/callback` },
              });
              if (error) throw error;
              if (data.session) location.href = "/reading";
              else
                setMessage(
                  "확인 메일을 보냈습니다. 받은 편지함에서 이메일 인증을 완료해 주세요. 이미 가입한 주소라면 로그인하거나 비밀번호를 재설정해 주세요.",
                );
            }
            if (mode === "reset") {
              const { error } = await db.auth.resetPasswordForEmail(email, {
                redirectTo: `${origin}/auth/callback?next=/auth?mode=update`,
              });
              if (error) throw error;
              setMessage(
                "등록된 이메일이라면 재설정 링크가 전송됩니다. 받은 편지함을 확인해 주세요.",
              );
            }
            if (mode === "update") {
              const { data } = await db.auth.getUser();
              if (!data.user)
                throw new Error("유효한 재설정 링크로 다시 접속해 주세요.");
              const { error } = await db.auth.updateUser({ password });
              if (error) throw error;
              location.href = "/reading";
            }
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "인증하지 못했습니다. 다시 시도해 주세요.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {mode !== "update" && (
          <>
            <label htmlFor="email">이메일</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}
        {mode !== "reset" && (
          <>
            <label htmlFor="password">
              {mode === "update" ? "새 비밀번호" : "비밀번호"}
            </label>
            <input
              id="password"
              type="password"
              minLength={8}
              required
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="muted">8자 이상 사용해 주세요.</p>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <button className="primary" disabled={busy || !configured()}>
          {busy ? "처리 중…" : names[mode]}
        </button>
      </form>
      <div className="auth-links">
        {(["signin", "signup", "reset"] as Mode[])
          .filter((m) => m !== mode)
          .map((m) => (
            <button
              key={m}
              className="secondary"
              onClick={() => {
                setMode(m);
                setError("");
                setMessage("");
                setPassword("");
              }}
            >
              {names[m]}
            </button>
          ))}
      </div>
    </section>
  );
}
