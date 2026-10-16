import { test, expect } from "@playwright/test";
test("sample reading: selection never auto-saves, explicit save, search, review, export and deletion", async ({
  page,
  isMobile,
}) => {
  await page.goto("/demo");
  await expect(page.getByText("샘플 모드 · 미리 작성한 번역")).toBeVisible();
  await page
    .getByRole("button", { name: "significant 설명 보기", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "이 문맥에서의 의미" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "내 어휘에 저장 Save to vocabulary" }),
  ).toBeEnabled();
  if (isMobile) {
    const box = await page.getByRole("dialog").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    expect(box!.y).toBeGreaterThanOrEqual(0);
  }
  await page.getByRole("button", { name: "설명 닫기" }).click();
  await page.getByRole("button", { name: "샘플 어휘", exact: true }).click();
  await expect(
    page.getByText("아직 저장한 표현이 없습니다.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "샘플 읽기", exact: true }).click();
  await page
    .getByRole("button", { name: "significant 설명 보기", exact: true })
    .click();
  await page
    .getByRole("button", { name: "내 어휘에 저장 Save to vocabulary" })
    .click();
  await expect(
    page.getByRole("button", { name: "저장됨 Saved ✓" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "설명 닫기" }).click();
  await page.getByRole("button", { name: "샘플 어휘", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "significant 상세 보기" }),
  ).toBeVisible();
  await page.getByLabel("표현 · 의미 · 자료 제목 검색").fill("missing");
  await expect(page.getByText("검색 결과가 없습니다.")).toBeVisible();
  await page.getByLabel("표현 · 의미 · 자료 제목 검색").fill("SIGNIFICANT");
  await expect(
    page.getByRole("button", { name: "significant 상세 보기" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "뜻 가리기" }).click();
  await expect(
    page.getByText("샘플 설명: 이 문맥에서의 통계적·학술적 의미"),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "significant 상세 보기" }).click();
  await expect(page.getByRole("heading", { name: "원문 문장" })).toBeVisible();
  await expect(
    page.getByText("The result was statistically significant.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "전체 어휘 JSON 내보내기" }).click();
  expect((await download).suggestedFilename()).toBe(
    "studybridge-vocabulary.json",
  );
  page.on("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "significant 삭제", exact: true })
    .click();
  await expect(page.getByText("항목을 삭제했습니다.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "significant 상세 보기" }),
  ).not.toBeVisible();
});
test("phrase selection is limited to one English source sentence", async ({
  page,
}) => {
  await page.goto("/demo");
  await page.locator('[data-source-id="p0-s0"]').evaluate((element) => {
    const node = element.querySelector("button")!.firstChild!;
    const last = element.querySelectorAll("button")[4].firstChild!;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(last, last.textContent!.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "선택한 구 설명하기" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "설명 닫기" }).click();
  await page.evaluate(() => {
    const first = document.querySelector(
      '[data-source-id="p0-s0"] button',
    )!.firstChild!;
    const second = document.querySelector(
      '[data-source-id="p0-s1"] button',
    )!.firstChild!;
    const range = document.createRange();
    range.setStart(first, 0);
    range.setEnd(second, second.textContent!.length);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.getByRole("button", { name: "선택한 구 설명하기" }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "표현은 한 영어 문장" }),
  ).toHaveText("표현은 한 영어 문장 안에서 선택해 주세요.");
});
test("keyboard word selection and responsive layout", async ({ page }) => {
  await page.goto("/demo");
  const word = page.getByRole("button", {
    name: "significant 설명 보기",
    exact: true,
  });
  await word.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: "설명 닫기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(word).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("protected pages redirect and APIs do not fabricate results without configuration", async ({
  page,
  request,
}) => {
  await page.goto("/reading");
  await expect(page).toHaveURL(/\/auth/);
  await expect(
    page.getByText("Supabase 설정이 필요합니다.", { exact: false }),
  ).toBeVisible();
  for (const url of ["/api/translate", "/api/explain", "/api/vocabulary"]) {
    const response = await request.post(url, { data: {} });
    expect(response.status()).toBe(503);
    expect(await response.json()).toHaveProperty("error");
  }
});
