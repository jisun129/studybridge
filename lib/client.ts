export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("서버 응답을 읽지 못했습니다. 다시 시도해 주세요.");
  }
  if (!response.ok)
    throw new Error(data.error || "요청하지 못했습니다. 다시 시도해 주세요.");
  return data as T;
}
