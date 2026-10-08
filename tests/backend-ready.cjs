const { expect } = require('@playwright/test');
const assert = require('node:assert/strict');

async function waitForBackend(page) {
  // BackendManager allows 15s for Python readiness, then 5s health polling
  // with a final request of up to 2s. Leave 3s for renderer/IPC scheduling.
  // Only startup/retry readiness uses this budget; UI assertions keep
  // Playwright's default timeout and an actual failed startup still fails.
  await expect(page.getByRole('heading', { name: '连接就绪' })).toBeVisible({ timeout: 25000 });
}

async function waitForResearchCollection(page, { panel = page, status = 'collected' } = {}) {
  const view = panel.getByTestId('research-run');
  await expect(view).toHaveAttribute('data-run-id', /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  const id = await view.getAttribute('data-run-id');
  let run = await page.evaluate(id => window.researchTrail.researchRun(id), id);
  assert.ok(run.plan.timeout_seconds > 0 && run.plan.timeout_seconds <= 20);
  assert.ok(run.plan.input.concurrency >= 1 && run.plan.input.concurrency <= 4);
  // Collection is asynchronous: await the Python plan's per-capability budget,
  // including its bounded drain and IPC scheduling; do not retry a wrong terminal.
  const batches = Math.ceil(run.plan.reads.length / run.plan.input.concurrency);
  await expect.poll(async () => {
    run = await page.evaluate(id => window.researchTrail.researchRun(id), id);
    return run.status;
  }, { timeout: batches * run.plan.timeout_seconds * 1000 + 6000, intervals: [100, 250, 500] }).not.toBe('fetching');
  assert.equal(run.id, id);
  assert.equal(run.status, status);
  assert.equal(run.completed, run.total);
  assert.equal(run.succeeded + run.failed, run.total);
  assert.ok(run.steps.every(step => !['queued', 'running'].includes(step.status)));
  // Rendering still has the original default 5s. No model calls or retries here.
  await expect(view).toHaveAttribute('data-run-id', id);
  await expect(view).toHaveAttribute('data-status', status);
  return run;
}

async function waitForEvaluationCompletion(page, status) {
  const experiment = await page.evaluate(async () => {
    const [latest] = await window.researchTrail.evaluationExperiments();
    if (!latest) throw new Error('Expected a saved evaluation experiment');
    return window.researchTrail.evaluationExperiment(latest.id);
  });
  let saved = experiment;
  // A suite runs cases sequentially, including two real migrated SQLite
  // sandboxes. Allow the 3s Agent budget per case plus sandbox/IPC scheduling;
  // UI assertions retain 5s and a wrong terminal status fails without retries.
  await expect.poll(async () => {
    saved = await page.evaluate(id => window.researchTrail.evaluationExperiment(id), experiment.id);
    return saved.status;
  }, { timeout: experiment.cases.length * 3000 + 25000, intervals: [100, 250, 500] })
    .not.toMatch(/^(not_run|running)$/);
  assert.equal(saved.id, experiment.id);
  assert.equal(saved.status, status);
  await expect(page.getByTestId('eval-experiment')).toHaveAttribute('data-status', status);
  return saved;
}

module.exports = { waitForBackend, waitForResearchCollection, waitForEvaluationCompletion };
