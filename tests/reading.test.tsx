// @vitest-environment jsdom
import React from "react";
import { beforeEach, describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import Reading from "@/components/reading";
import { demoSentences, demoDetail } from "@/lib/demo";
const translated = { sentences: demoSentences, title: "Statistics" };
beforeEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.stubGlobal("React", React);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});
function response(data: unknown, status = 200) {
  return { ok: status < 400, json: async () => data } as Response;
}
async function start() {
  render(<Reading />);
  fireEvent.change(screen.getByLabelText("영어 발췌문"), {
    target: { value: demoSentences[0].english },
  });
  fireEvent.change(screen.getByLabelText("자료 제목"), {
    target: { value: "Statistics" },
  });
  fireEvent.click(screen.getByRole("button", { name: "번역하기 Translate" }));
  await screen.findByRole("button", { name: "significant 설명 보기" });
  fireEvent.click(
    screen.getByRole("button", { name: "significant 설명 보기" }),
  );
  await screen.findByText("이 문맥에서의 의미");
}
describe("real reading component with mocked HTTP integration", () => {
  it("selection displays details without saving; explicit save contains complete data and caches explanation", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return response(
          url.endsWith("translate")
            ? translated
            : url.endsWith("explain")
              ? demoDetail("significant")
              : { entry: { id: "confirmed" }, duplicate: false },
        );
      }),
    );
    await start();
    expect(calls.map((c) => c.url)).toEqual(["/api/translate", "/api/explain"]);
    fireEvent.click(
      screen.getByRole("button", {
        name: "내 어휘에 저장 Save to vocabulary",
      }),
    );
    await screen.findByRole("button", { name: "저장됨 Saved ✓" });
    const saved = JSON.parse(
      calls.find((c) => c.url === "/api/vocabulary")!.init!.body as string,
    );
    expect(saved).toMatchObject({
      expression: "significant",
      title: "Statistics",
      sentence: demoSentences[0],
      examples: demoDetail("significant").examples,
      meaning: demoDetail("significant").meaning,
      usage: demoDetail("significant").usage,
    });
    expect(
      screen
        .getByRole("button", { name: "저장됨 Saved ✓" })
        .hasAttribute("disabled"),
    ).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "설명 닫기" }));
    fireEvent.click(
      screen.getByRole("button", { name: "significant 설명 보기" }),
    );
    await screen.findByText("이 문맥에서의 의미");
    expect(calls.filter((c) => c.url === "/api/explain")).toHaveLength(1);
  });
  it("save failure retains explanation and only confirms after retry", async () => {
    let saves = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.endsWith("translate")) return response(translated);
        if (url.endsWith("explain")) return response(demoDetail("significant"));
        return ++saves === 1
          ? response({ error: "일시적 저장 오류" }, 502)
          : response({ entry: { id: "confirmed" }, duplicate: false });
      }),
    );
    await start();
    fireEvent.click(
      screen.getByRole("button", { name: "내 어휘에 저장 Save to vocabulary" }),
    );
    await screen.findByText("일시적 저장 오류");
    expect(screen.queryByRole("button", { name: "저장됨 Saved ✓" })).toBeNull();
    expect(screen.getByText("이 문맥에서의 의미")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "저장 다시 시도" }));
    await screen.findByRole("button", { name: "저장됨 Saved ✓" });
    expect(saves).toBe(2);
  });
  it("explanation failure offers retry and does not save", async () => {
    let explanations = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith("translate")) return response(translated);
      return ++explanations === 1
        ? response({ error: "설명 오류" }, 502)
        : response(demoDetail("significant"));
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<Reading />);
    fireEvent.change(screen.getByLabelText("영어 발췌문"), {
      target: { value: "The result is significant." },
    });
    fireEvent.click(screen.getByRole("button", { name: "번역하기 Translate" }));
    await screen.findByRole("button", { name: "significant 설명 보기" });
    fireEvent.click(
      screen.getByRole("button", { name: "significant 설명 보기" }),
    );
    await screen.findByText("설명 오류");
    fireEvent.click(screen.getByRole("button", { name: "설명 다시 시도" }));
    await screen.findByText("이 문맥에서의 의미");
    expect(
      fetchMock.mock.calls.some(([url]) => url === "/api/vocabulary"),
    ).toBe(false);
  });
  it("translation failure preserves input and allows retry", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => response({ error: "번역 오류" }, 502)),
    );
    render(<Reading />);
    const input = screen.getByLabelText("영어 발췌문") as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: "Keep this source." } });
    fireEvent.click(screen.getByRole("button", { name: "번역하기 Translate" }));
    await screen.findByText("번역 오류");
    expect(input.value).toBe("Keep this source.");
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: "번역하기 Translate" })
          .hasAttribute("disabled"),
      ).toBe(false),
    );
  });
});
