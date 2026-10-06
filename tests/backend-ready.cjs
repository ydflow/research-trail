const { expect } = require('@playwright/test');

async function waitForBackend(page) {
  // BackendManager allows 15s for Python readiness, then 5s health polling
  // with a final request of up to 2s. Leave 3s for renderer/IPC scheduling.
  // Only startup/retry readiness uses this budget; business assertions keep
  // Playwright's default timeout and an actual failed startup still fails.
  await expect(page.getByRole('heading', { name: '连接就绪' })).toBeVisible({ timeout: 25000 });
}

module.exports = { waitForBackend };
