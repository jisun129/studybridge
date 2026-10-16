import { beforeEach, it, expect, vi } from "vitest";
const mock = vi.hoisted(() => ({ auth: vi.fn(), rpc: vi.fn() }));
vi.mock("@/lib/server", async (original) => ({
  ...(await original<typeof import("@/lib/server")>()),
  requireUser: mock.auth,
}));
import { aiAccess } from "@/lib/ai";
beforeEach(() => {
  vi.clearAllMocks();
  process.env.STUDYBRIDGE_AI_KEY = "mock-only";
  mock.auth.mockResolvedValue({ user: { id: "owner" }, db: { rpc: mock.rpc } });
});
it("uses durable authenticated database RPC and rejects exhausted allowance", async () => {
  mock.rpc.mockResolvedValue({ data: false, error: null });
  await expect(aiAccess()).rejects.toMatchObject({ status: 429 });
  expect(mock.rpc).toHaveBeenCalledWith("consume_ai_request");
});
it("fails closed when limiter is unavailable", async () => {
  mock.rpc.mockResolvedValue({
    data: null,
    error: { message: "Missing migration" },
  });
  await expect(aiAccess()).rejects.toMatchObject({ status: 503 });
});
it("allows authenticated operations only after limiter confirms allowance", async () => {
  mock.rpc.mockResolvedValue({ data: true, error: null });
  await expect(aiAccess()).resolves.toMatchObject({ user: { id: "owner" } });
});
