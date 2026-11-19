import { expect, test } from "@playwright/test";
import { loginAs, seededUsers, skipUnlessSeeded } from "./helpers";
import { buildMinimalPdf } from "./minimalPdf";

test.describe("Sprint 9 Knowledge Hub", () => {
  test.beforeEach(() => {
    skipUnlessSeeded();
  });

  // No seed file inserts documents, so the test uploads its own uniquely named document
  // (founder decision 2026-11-15) and soft-deletes it at the end.
  test("uploads, searches, previews, archives and restores a document", async ({ page }) => {
    // Eight steps against a remote target; staging run7 (2026-11-19) reached "Restore" and hit the 30 s default.
    test.setTimeout(90_000);
    // Saves on staging sometimes take over 5 s (run8: Delete was still saving at 5 s).
    const saveWait = { timeout: 20_000 };
    const title = `E2E knowledge doc ${Date.now()}`;
    const fileName = `${title}.md`;

    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: /Knowledge Hub/i }).click();
    // The section shows a loading state until five list calls finish; on staging that took over 5 s
    // for the org admin (2026-11-18 run kh1), so the first render gets a longer wait.
    await expect(page.getByRole("heading", { name: "Knowledge Hub" })).toBeVisible({ timeout: 30_000 });

    // The Upload button opens a hidden file input; set the file on the input directly.
    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "text/markdown",
      buffer: Buffer.from(`# ${title}\n\nRisk register review created by the Playwright suite.\n`),
    });

    // The card only appears once the storage upload and the documents row both succeeded.
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible({ timeout: 30_000 });
    // Extraction and indexing must succeed too. Staging 2026-11-19: /api/documents/extract returned 500
    // on every upload, which the old test could not see, because the card still appeared.
    await expect(page.getByText(`${fileName}: Indexed for search.`, { exact: true })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Document Preview")).toBeVisible();

    await page.getByPlaceholder(/Search title/i).fill(title);
    await page.getByRole("button", { name: "Documents", exact: true }).click();
    await page.getByRole("button", { name: new RegExp(title) }).click();
    await expect(page.getByText("Document Preview")).toBeVisible();

    // Exact toast text: the local-fallback variant appends "Local fallback is active." and must fail here.
    await page.getByRole("button", { name: "Un-index (Archive)" }).click();
    await expect(page.getByText("Document archived and removed from AI/RAG indexing.", { exact: true })).toBeVisible(saveWait);

    await page.getByRole("button", { name: "Archived", exact: true }).click();
    await expect(page.getByRole("button", { name: new RegExp(title) })).toBeVisible();
    await page.getByRole("button", { name: "Restore", exact: true }).click();
    await expect(page.getByText("Document restored.", { exact: true })).toBeVisible(saveWait);

    // Clean up: soft delete, so staging does not accumulate test documents.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Document deleted.", { exact: true })).toBeVisible(saveWait);
  });

  // PDFs need pdf-parse and the @napi-rs/canvas native addon on the server. Staging 2026-11-19:
  // that failed to load on Vercel, so this checks a real PDF gets its text layer indexed.
  test("indexes the text of an uploaded PDF", async ({ page }) => {
    test.setTimeout(90_000);
    const fileName = `E2E knowledge pdf ${Date.now()}.pdf`;

    await loginAs(page, seededUsers.orgAdminAlpha);
    await page.getByRole("button", { name: /Knowledge Hub/i }).click();
    await expect(page.getByRole("heading", { name: "Knowledge Hub" })).toBeVisible({ timeout: 30_000 });

    await page.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: "application/pdf",
      buffer: buildMinimalPdf("Risk register review created by the Playwright suite"),
    });
    await expect(page.getByText(`${fileName}: Indexed for search.`, { exact: true })).toBeVisible({ timeout: 45_000 });

    // Clean up: the uploaded document is selected; soft delete it.
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page.getByText("Document deleted.", { exact: true })).toBeVisible({ timeout: 20_000 });
  });

  test("hides upload actions from guest users", async ({ page }) => {
    await loginAs(page, seededUsers.guestAlpha);
    await page.getByRole("button", { name: /Knowledge Hub/i }).click();

    await expect(page.getByRole("heading", { name: "Knowledge Hub" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Upload/i })).toBeDisabled();
  });
});
