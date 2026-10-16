import { beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  structured: vi.fn(),
  db: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("@/lib/server", async (original) => {
  const actual = await original<typeof import("@/lib/server")>();
  return { ...actual, requireUser: mocks.auth };
});
vi.mock("@/lib/ai", async () => {
  const { HttpError } = await import("@/lib/server");
  return {
    aiAccess: async () => {
      const result = await mocks.auth();
      if (!process.env.STUDYBRIDGE_AI_KEY)
        throw new HttpError(503, "AI API 키 설정이 필요합니다.");
      return result;
    },
    structured: mocks.structured,
  };
});
import { POST as translate } from "@/app/api/translate/route";
import { POST as explain } from "@/app/api/explain/route";
import { GET as list, POST as save } from "@/app/api/vocabulary/route";
import { DELETE as remove } from "@/app/api/vocabulary/[id]/route";
import { HttpError } from "@/lib/server";
import { demoDetail, demoSentences } from "@/lib/demo";
const payload = {
  ...demoDetail("significant"),
  sentence: demoSentences[0],
  title: "Statistics",
};
const req = (path: string, data: unknown) =>
  new Request(`http://localhost:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost:3000",
    },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.STUDYBRIDGE_AI_KEY;
  mocks.auth.mockResolvedValue({ user: { id: "owner" }, db: mocks.db });
});
describe("server operation protection (mocked authentication and database)", () => {
  it("requires authentication for both AI and all vocabulary operations", async () => {
    mocks.auth.mockRejectedValue(new HttpError(401, "로그인 필요"));
    const results = await Promise.all([
      translate(req("/api/translate", {})),
      explain(req("/api/explain", {})),
      list(),
      save(req("/api/vocabulary", payload)),
      remove(
        new Request("http://localhost:3000/api/vocabulary/x", {
          method: "DELETE",
        }),
        { params: Promise.resolve({ id: "123" }) },
      ),
    ]);
    expect(results.map((r) => r.status)).toEqual([401, 401, 401, 401, 401]);
    expect(mocks.db.from).not.toHaveBeenCalled();
    expect(mocks.structured).not.toHaveBeenCalled();
  });
  it("fails honestly when AI credentials are missing", async () => {
    expect(
      (await translate(req("/api/translate", { text: "One." }))).status,
    ).toBe(503);
    expect(mocks.structured).not.toHaveBeenCalled();
  });
  it("rejects cross-origin writes", async () => {
    const r = new Request("http://localhost:3000/api/vocabulary", {
      method: "POST",
      headers: { origin: "https://evil.example" },
      body: JSON.stringify(payload),
    });
    expect((await save(r)).status).toBe(403);
    expect(mocks.auth).not.toHaveBeenCalled();
  });
  it("limits input and rejects malformed alignment", async () => {
    process.env.STUDYBRIDGE_AI_KEY = "mock-only";
    expect(
      (await translate(req("/api/translate", { text: "x".repeat(12001) })))
        .status,
    ).toBe(400);
    mocks.structured.mockResolvedValue({ translations: [] });
    expect(
      (await translate(req("/api/translate", { text: "One." }))).status,
    ).toBe(502);
  });
  it("filters lists by authenticated owner", async () => {
    const range = vi.fn().mockResolvedValue({ data: [], error: null });
    const order = vi.fn();
    order.mockReturnValue({ order, range });
    const eq = vi.fn(() => ({ order }));
    mocks.db.from.mockReturnValue({ select: () => ({ eq }) });
    expect((await list()).status).toBe(200);
    expect(eq).toHaveBeenCalledWith("user_id", "owner");
  });
  it("loads all pages rather than silently truncating exports at the service limit", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({ id: String(i) })),
        error: null,
      })
      .mockResolvedValueOnce({ data: [{ id: "last" }], error: null });
    const order = vi.fn();
    order.mockReturnValue({ order, range });
    mocks.db.from.mockReturnValue({
      select: () => ({ eq: () => ({ order }) }),
    });
    const response = await list();
    expect((await response.json()).entries).toHaveLength(501);
    expect(range).toHaveBeenNthCalledWith(1, 0, 499);
    expect(range).toHaveBeenNthCalledWith(2, 500, 999);
  });
  it("does not claim a failed save succeeded; retry works", async () => {
    const single = vi
      .fn()
      .mockResolvedValueOnce({ error: { code: "network" } })
      .mockResolvedValueOnce({
        data: {
          id: "entry",
          ...payload,
          source_sentence: payload.sentence.english,
          source_translation: payload.sentence.korean,
          material_title: payload.title,
          created_at: "now",
        },
        error: null,
      });
    const insert = vi.fn((_record: unknown) => ({
      select: () => ({ single }),
    }));
    mocks.db.from.mockReturnValue({ insert });
    expect((await save(req("/api/vocabulary", payload))).status).toBe(502);
    expect((await save(req("/api/vocabulary", payload))).status).toBe(200);
    expect(insert.mock.calls[0][0]).toMatchObject({
      user_id: "owner",
      expression: "significant",
      examples: payload.examples,
    });
  });
  it("returns existing record when DB unique constraint prevents duplicates", async () => {
    const single = vi.fn().mockResolvedValue({
      data: {
        id: "existing",
        source_sentence: payload.sentence.english,
        source_translation: payload.sentence.korean,
        material_title: payload.title,
        ...payload,
      },
      error: null,
    });
    const eq = vi.fn();
    eq.mockReturnValue({ eq, single });
    mocks.db.from.mockReturnValue({
      insert: () => ({
        select: () => ({ single: async () => ({ error: { code: "23505" } }) }),
      }),
      select: () => ({ eq }),
    });
    const response = await save(req("/api/vocabulary", payload));
    expect((await response.json()).duplicate).toBe(true);
    expect(eq).toHaveBeenCalledWith("user_id", "owner");
    expect(eq).toHaveBeenCalledWith("normalized_expression", "significant");
    expect(eq).toHaveBeenCalledWith(
      "source_hash",
      expect.stringMatching(/^[a-f0-9]{64}$/),
    );
  });
  it("deletion restricts both record and owner", async () => {
    const select = vi
      .fn()
      .mockResolvedValue({ data: [{ id: "deleted" }], error: null });
    const eq = vi.fn();
    eq.mockReturnValue({ eq, select });
    mocks.db.from.mockReturnValue({ delete: () => ({ eq }) });
    const id = "12345678-1234-1234-1234-123456789012";
    expect(
      (
        await remove(
          new Request(`http://localhost:3000/api/vocabulary/${id}`, {
            method: "DELETE",
          }),
          { params: Promise.resolve({ id }) },
        )
      ).status,
    ).toBe(200);
    expect(eq).toHaveBeenCalledWith("user_id", "owner");
    expect(eq).toHaveBeenCalledWith("id", id);
  });
});
