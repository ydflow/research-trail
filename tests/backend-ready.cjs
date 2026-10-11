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

function automaticResearchState(view, ruleName, symbol) {
  const rules = view.rules.filter(rule => rule.input.name === ruleName);
  assert.ok(rules.length <= 1, 'Automatic research must have exactly one saved rule');
  if (!rules.length) return { phase: 'waiting-rule' };
  const runs = view.runs.filter(run => run.rule_id === rules[0].id);
  assert.ok(runs.length <= 1, 'Automatic research must not repeat a monitoring occurrence');
  if (!runs.length) return { phase: 'waiting-run' };
  const run = runs[0];
  if (run.status === 'running') return { phase: 'running', run };
  assert.equal(run.status, 'triggered', `Monitoring ended as ${run.status}: ${run.code}`);
  assert.equal(run.code, null);
  assert.equal(run.payload.auto_research, true);
  assert.equal(run.payload.model_requests, 0);
  const actions = view.research_actions.filter(action => action.run_id === run.id && action.symbol === symbol);
  assert.ok(actions.length <= 1, 'Automatic research must not dispatch twice');
  if (!actions.length) return { phase: 'waiting-action', run };
  const action = actions[0];
  if (action.status === 'claimed') return { phase: 'claimed', run, action };
  assert.equal(action.status, 'dispatched', `Dispatch ended as ${action.status}: ${action.code}`);
  assert.equal(action.code, null);
  assert.match(action.research_id, /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/);
  return { phase: 'dispatched', run, action };
}

async function waitForAutomaticResearch(page, ruleName, symbol, { timeout = 15000 } = {}) {
  assert.ok(Number.isFinite(timeout) && timeout > 0 && timeout <= 15000, 'Automatic research wait budget must be bounded');
  let saved, failure;
  // Saving a rule only commits it. The fixture scheduler wakes every 100ms;
  // monitoring evaluation and dispatch then use separate SQLite transactions
  // (5s busy budgets), with IPC requests bounded at 3s. Give this asynchronous
  // test phase a finite 15s ceiling; do not extend any DOM assertion timeout.
  // Poll only the read-only Today API. A wrong terminal or API error fails
  // immediately; never call tick/start/research or retry a failed dispatch.
  await expect.poll(async () => {
    try {
      const view = await page.evaluate(() => window.researchTrail.today('Asia/Shanghai'));
      saved = automaticResearchState(view, ruleName, symbol);
      return saved.phase;
    } catch (error) { failure = error; return 'invalid'; }
  }, { timeout, intervals: [100, 250, 500] }).not.toMatch(/^(waiting-rule|waiting-run|running|waiting-action|claimed)$/);
  if (failure) throw failure;
  assert.equal(saved.phase, 'dispatched');
  const row = page.locator(`[data-testid="monitor-run"][data-run-id="${saved.run.id}"]`);
  // Require the normal 3s Today polling to render it within the original 5s.
  // No manual refresh: a broken renderer poll must still fail this test.
  await expect(row.getByTestId('monitor-research-action')).toContainText('dispatched');
  // One DOM wait only. Read the correlated status and ID immediately instead
  // of giving subsequent assertions another 5s window to repair stale UI.
  const rendered = await row.evaluateAll(rows => rows.map(element => ({
    runId: element.getAttribute('data-run-id'), status: element.getAttribute('data-status'),
    actionText: element.querySelector('[data-testid="monitor-research-action"]')?.textContent ?? '',
  })));
  assert.equal(rendered.length, 1);
  assert.equal(rendered[0].runId, saved.run.id);
  assert.equal(rendered[0].status, 'triggered');
  assert.ok(rendered[0].actionText.includes(saved.action.research_id), 'Rendered research ID must match Python dispatch');
  return saved;
}

module.exports = { waitForBackend, waitForResearchCollection, waitForEvaluationCompletion,
  automaticResearchState, waitForAutomaticResearch };
