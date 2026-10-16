"use client";
import { useEffect, useRef, useState } from "react";
import {
  MAX_TEXT,
  detailSchema,
  sentenceSchema,
  type Sentence,
  type Detail,
  type Entry,
  normalizeExpression,
} from "@/lib/contracts";
import { selectedExpression } from "@/lib/sentences";
import { request } from "@/lib/client";
import { demoSentences, demoDetail, demoSave } from "@/lib/demo";
import DetailContent from "./detail";
type Choice = { expression: string; sentence: Sentence };
export default function Reading({ demo = false }: { demo?: boolean }) {
  const [text, setText] = useState(
    demo ? demoSentences.map((s) => s.english).join("\n\n") : "",
  );
  const [title, setTitle] = useState(demo ? "통계학 샘플" : "");
  const [sessionTitle, setSessionTitle] = useState("");
  const [sentences, setSentences] = useState<Sentence[]>(
    demo ? demoSentences : [],
  );
  const [preview, setPreview] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState("");
  const [choice, setChoice] = useState<Choice | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [explainError, setExplainError] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [toast, setToast] = useState("");
  const cache = useRef(new Map<string, Detail>());
  const savedKeys = useRef(new Set<string>());
  const activeRequest = useRef(0);
  const busySave = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const key = (c: Choice) =>
    JSON.stringify([
      normalizeExpression(c.expression),
      c.sentence.english,
      c.sentence.korean,
    ]);
  useEffect(() => {
    if (choice) {
      returnFocus.current = document.activeElement as HTMLElement;
      closeButton.current?.focus({ preventScroll: true });
    }
  }, [choice]);
  function close() {
    activeRequest.current++;
    setChoice(null);
    setDetail(null);
    returnFocus.current?.focus({ preventScroll: true });
  }
  async function explain(c: Choice) {
    const token = ++activeRequest.current;
    setChoice(c);
    setDetail(null);
    setExplainError("");
    setSaveError("");
    setSaved(savedKeys.current.has(key(c)));
    const previous = cache.current.get(key(c));
    if (previous) {
      setDetail(previous);
      setExplaining(false);
      return;
    }
    setExplaining(true);
    try {
      const context = sentences
        .filter((s) => Math.abs(s.paragraph - c.sentence.paragraph) <= 1)
        .map((s) => s.english)
        .join("\n")
        .slice(0, MAX_TEXT);
      const raw = demo
        ? demoDetail(c.expression)
        : await request<Detail>("/api/explain", {
            method: "POST",
            body: JSON.stringify({ ...c, context }),
          });
      const result = detailSchema.parse(raw);
      if (token !== activeRequest.current) return;
      cache.current.set(key(c), result);
      setDetail(result);
    } catch (e) {
      if (token === activeRequest.current)
        setExplainError(
          e instanceof Error ? e.message : "설명하지 못했습니다.",
        );
    } finally {
      if (token === activeRequest.current) setExplaining(false);
    }
  }
  function selectPhrase() {
    try {
      const selection = selectedExpression(window.getSelection());
      if (!selection) return;
      const sentence = sentences.find((s) => s.id === selection.sentenceId);
      if (sentence) {
        setError("");
        void explain({ ...selection, sentence });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function translate() {
    if (translating) return;
    if (
      sentences.length &&
      !window.confirm(
        "현재 읽기 세션을 새 본문으로 교체할까요? 저장하지 않은 설명은 사라집니다.",
      )
    )
      return;
    setTranslating(true);
    setError("");
    try {
      if (demo) {
        setSentences(demoSentences);
        setSessionTitle("통계학 샘플");
      } else {
        const result = await request<{ sentences: Sentence[]; title: string }>(
          "/api/translate",
          { method: "POST", body: JSON.stringify({ text, title }) },
        );
        setSentences(result.sentences.map((s) => sentenceSchema.parse(s)));
        setSessionTitle(result.title);
      }
      close();
      cache.current.clear();
      savedKeys.current.clear();
      setPreview(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "번역하지 못했습니다.");
    } finally {
      setTranslating(false);
    }
  }
  async function save() {
    if (!choice || !detail || saved || busySave.current) return;
    busySave.current = true;
    setSaving(true);
    setSaveError("");
    const snapshot = choice;
    try {
      const input = {
        ...detail,
        expression: choice.expression,
        sentence: choice.sentence,
        title: sessionTitle || title.trim() || "Untitled material",
      };
      const response = demo
        ? demoSave(input)
        : await request<{ entry: Entry; duplicate: boolean }>(
            "/api/vocabulary",
            { method: "POST", body: JSON.stringify(input) },
          );
      if (!response.entry?.id)
        throw new Error("저장 확인을 받지 못했습니다. 다시 시도해 주세요.");
      savedKeys.current.add(key(snapshot));
      setSaved(true);
      setToast(
        demo
          ? "샘플 어휘에만 저장되었습니다. 새로고침하면 사라집니다."
          : response.duplicate
            ? "이미 저장된 표현입니다."
            : "내 어휘에 저장했습니다.",
      );
    } catch (e) {
      setSaveError(
        e instanceof Error
          ? e.message
          : "저장하지 못했습니다. 다시 시도해 주세요.",
      );
    } finally {
      busySave.current = false;
      setSaving(false);
    }
  }
  function words(s: Sentence) {
    let offset = 0;
    const start =
      choice?.sentence.id === s.id
        ? s.english.toLowerCase().indexOf(choice.expression.toLowerCase())
        : -1;
    return s.english.split(/(\s+)/).map((part, i) => {
      const from = offset;
      offset += part.length;
      if (/^\s+$/.test(part)) return <span key={i}>{part}</span>;
      const expression = part.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
      if (!expression) return <span key={i}>{part}</span>;
      return (
        <button
          type="button"
          key={i}
          className={
            "word" +
            (start >= 0 &&
            from < start + choice!.expression.length &&
            offset > start
              ? " selected"
              : "")
          }
          aria-label={`${expression} 설명 보기`}
          disabled={saving}
          onClick={() => {
            if (window.getSelection()?.toString().trim()) return;
            setError("");
            void explain({ expression, sentence: s });
          }}
        >
          {part}
        </button>
      );
    });
  }
  return (
    <>
      <p className="eyebrow">BILINGUAL READING</p>
      <div className="row between">
        <div>
          <h1>문맥 속에서 읽기</h1>
          <p className="muted">
            단어를 누르거나 한 문장 안에서 구를 선택하세요. 선택만으로 저장되지
            않습니다.
          </p>
        </div>
      </div>
      {demo && (
        <p className="notice">
          샘플 모드 · 미리 작성한 번역과 설명입니다. 실제 AI·인증·DB를 사용하지
          않습니다. 샘플 저장은 이 탭의 메모리에만 남습니다.
        </p>
      )}
      <section className="card" aria-label="영어 자료 입력">
        <label htmlFor="title">자료 제목</label>
        <input
          id="title"
          maxLength={200}
          value={title}
          placeholder="Untitled material"
          disabled={demo}
          onChange={(e) => setTitle(e.target.value)}
        />
        <label htmlFor="text">영어 발췌문</label>
        <textarea
          id="text"
          maxLength={MAX_TEXT}
          value={text}
          disabled={demo}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(false);
          }}
          placeholder="논문이나 강의의 영어 발췌문을 붙여 넣으세요."
        />
        <p className="count" aria-live="polite">
          {text.length.toLocaleString()} / 12,000자
        </p>
        <div className="row">
          <button
            className="secondary"
            disabled={!text.trim() || translating}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "미리보기 닫기" : "문장부호 수정 · 미리보기"}
          </button>
          <button
            className="primary"
            disabled={
              !text.trim() || translating || saving || text.length > MAX_TEXT
            }
            onClick={() => void translate()}
          >
            {translating ? "번역 중…" : "번역하기 Translate"}
          </button>
        </div>
        {preview && (
          <>
            <label htmlFor="preview">
              편집 가능한 미리보기 · 수정 내용이 번역에 반영됩니다
            </label>
            <textarea
              id="preview"
              maxLength={MAX_TEXT}
              disabled={demo}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </>
        )}
        <p className="muted">
          텍스트는 AI 제공자(OpenAI)에 전송됩니다. 전체 본문은 앱 DB에 저장하지
          않습니다. 저장한 어휘에는 해당 원문 문장만 보관됩니다. AI 번역·설명은
          오류가 있을 수 있으니 원문과 확인하세요.
        </p>
      </section>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {toast && (
        <p role="status" className="notice">
          {toast}
        </p>
      )}
      {!sentences.length ? (
        <div className="empty">
          영어 발췌문을 입력하면 문장별 한국어 번역이 나란히 표시됩니다.
        </div>
      ) : (
        <div className="workspace">
          <section
            className="card"
            style={{ padding: 0 }}
            aria-label="문장별 번역"
          >
            <div className="reading-head">
              <span>
                ENGLISH · {sessionTitle || title || "Untitled material"}
              </span>
              <span>한국어</span>
            </div>
            <div className="row" style={{ padding: 12 }}>
              <button
                className="secondary"
                disabled={saving}
                onClick={selectPhrase}
              >
                선택한 구 설명하기
              </button>
              <span className="muted">
                키보드: Tab으로 단어 이동, Enter로 설명. 구는 Shift+방향키로
                선택 후 이 버튼을 누르세요.
              </span>
            </div>
            <div
              onMouseUp={() => {
                if (!saving) selectPhrase();
              }}
              onTouchEnd={() => {
                if (!saving) selectPhrase();
              }}
            >
              {sentences.map((s, i) => (
                <div
                  key={s.id}
                  className={
                    "sentence" +
                    (choice?.sentence.id === s.id ? " active" : "") +
                    (i > 0 && s.paragraph !== sentences[i - 1].paragraph
                      ? " paragraph"
                      : "")
                  }
                >
                  <div className="english" data-source-id={s.id}>
                    {words(s)}
                  </div>
                  <div className="korean">{s.korean}</div>
                </div>
              ))}
            </div>
          </section>
          <aside
            ref={panel}
            className={"panel card" + (choice ? " open" : "")}
            role={choice ? "dialog" : undefined}
            aria-labelledby={choice ? "panel-title" : undefined}
            onKeyDown={(e) => {
              if (e.key === "Escape" && !saving) {
                e.preventDefault();
                close();
              }
              if (e.key === "Tab" && choice) {
                const items = panel.current?.querySelectorAll<HTMLElement>(
                  "button:not(:disabled),a[href],input",
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
            {!choice ? (
              <>
                <h2>표현 살펴보기</h2>
                <p className="muted">
                  모르는 단어나 구를 선택하면 이곳에 문맥 설명이 나타납니다.
                  저장은 직접 결정하세요.
                </p>
              </>
            ) : (
              <>
                <div className="row between">
                  <h2 id="panel-title">표현 설명</h2>
                  <button
                    ref={closeButton}
                    className="secondary"
                    disabled={saving}
                    aria-label="설명 닫기"
                    onClick={close}
                  >
                    닫기
                  </button>
                </div>
                {explaining && <p role="status">문맥을 살펴보는 중…</p>}
                {explainError && (
                  <>
                    <p role="alert" className="error">
                      {explainError}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => void explain(choice)}
                    >
                      설명 다시 시도
                    </button>
                  </>
                )}
                {detail && (
                  <>
                    <DetailContent detail={detail} sentence={choice.sentence} />
                    {saveError && (
                      <p className="error" role="alert">
                        {saveError}
                      </p>
                    )}
                    <button
                      className="primary"
                      disabled={saving || saved}
                      onClick={() => void save()}
                    >
                      {saved
                        ? "저장됨 Saved ✓"
                        : saving
                          ? "저장 중…"
                          : saveError
                            ? "저장 다시 시도"
                            : "내 어휘에 저장 Save to vocabulary"}
                    </button>
                  </>
                )}
              </>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
