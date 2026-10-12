"use client";
import { useEffect, useRef, useState } from "react";
import { filterEntries, type Entry } from "@/lib/contracts";
import { request } from "@/lib/client";
import { demoEntries, demoDelete } from "@/lib/demo";
import DetailContent from "./detail";
export default function Vocabulary({ demo = false }: { demo?: boolean }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [query, setQuery] = useState("");
  const [hidden, setHidden] = useState(false);
  const [selected, setSelected] = useState<Entry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState("");
  const close = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  async function load() {
    setLoading(true);
    setError("");
    try {
      setEntries(
        demo
          ? demoEntries()
          : (await request<{ entries: Entry[] }>("/api/vocabulary")).entries,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [demo]); // reload on mode changes
  useEffect(() => {
    if (selected) {
      previous.current = document.activeElement as HTMLElement;
      close.current?.focus();
    }
  }, [selected]);
  function dismiss() {
    setSelected(null);
    previous.current?.focus();
  }
  async function remove(entry: Entry) {
    if (deleting || !window.confirm(`“${entry.expression}” 항목을 삭제할까요?`))
      return;
    setDeleting(true);
    setError("");
    try {
      if (demo) demoDelete(entry.id);
      else await request(`/api/vocabulary/${entry.id}`, { method: "DELETE" });
      setEntries((list) => list.filter((e) => e.id !== entry.id));
      if (selected?.id === entry.id) dismiss();
      setNotice("항목을 삭제했습니다.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  }
  function exportJson() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, exported_at: new Date().toISOString(), entries },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "studybridge-vocabulary.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const filtered = filterEntries(entries, query);
  return (
    <>
      <p className="eyebrow">YOUR CONTEXTUAL COLLECTION</p>
      <h1>내 어휘 My Vocabulary</h1>
      <p className="muted">읽으며 직접 저장한 표현과 문맥을 다시 살펴보세요.</p>
      {demo && (
        <p className="notice">
          샘플 모드 · 이 탭의 메모리에만 저장됩니다. 실제 개인 어휘와 분리되어
          있습니다.
        </p>
      )}
      <div className="card">
        <label htmlFor="search">표현 · 의미 · 자료 제목 검색</label>
        <input
          id="search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="예: significant 또는 통계"
        />
        <div className="row" style={{ marginTop: 16 }}>
          <button
            className="secondary"
            aria-pressed={hidden}
            onClick={() => setHidden((h) => !h)}
          >
            {hidden ? "뜻 보이기" : "뜻 가리기"}
          </button>
          <button
            className="secondary"
            disabled={loading || !!error}
            onClick={exportJson}
          >
            전체 어휘 JSON 내보내기
          </button>
          <span className="muted">{filtered.length}개 · 최근 저장순</span>
        </div>
      </div>
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="secondary" onClick={() => void load()}>
            다시 불러오기
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">내 어휘를 불러오는 중…</p>
      ) : !filtered.length ? (
        <div className="empty">
          {query
            ? "검색 결과가 없습니다."
            : "아직 저장한 표현이 없습니다. 읽기 화면에서 표현을 선택하고 “내 어휘에 저장”을 눌러 주세요."}
        </div>
      ) : (
        <div className="vocabulary-grid">
          {filtered.map((entry) => (
            <article className="card" key={entry.id}>
              <button
                className="entry-open"
                aria-label={`${entry.expression} 상세 보기`}
                onClick={() => setSelected(entry)}
              >
                <strong>{entry.expression}</strong>
                {!hidden && <p>{entry.meaning}</p>}
                <p className="muted">{entry.title}</p>
                <p className="entry-date">
                  {new Date(entry.created_at).toLocaleString("ko-KR")}
                </p>
              </button>
              <button
                className="secondary"
                disabled={deleting}
                onClick={() => void remove(entry)}
                aria-label={`${entry.expression} 삭제`}
              >
                삭제
              </button>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <div className="modal-backdrop">
          <div
            ref={dialog}
            className="modal card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="entry-heading"
            onKeyDown={(e) => {
              if (e.key === "Escape" && !deleting) dismiss();
              if (e.key === "Tab") {
                const items = dialog.current?.querySelectorAll<HTMLElement>(
                  "button:not(:disabled)",
                );
                if (!items?.length) return;
                const first = items[0],
                  last = items[items.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="row between">
              <h2 id="entry-heading">저장한 표현</h2>
              <button ref={close} className="secondary" onClick={dismiss}>
                닫기
              </button>
            </div>
            <DetailContent detail={selected} sentence={selected.sentence} />
            <p className="muted">
              자료: {selected.title} · 저장:{" "}
              {new Date(selected.created_at).toLocaleString("ko-KR")}
            </p>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <button
              className="secondary"
              disabled={deleting}
              onClick={() => void remove(selected)}
            >
              {deleting ? "삭제 중…" : "이 항목 삭제"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
