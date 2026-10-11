const { test } = require('node:test');
const assert = require('node:assert/strict');
const { automaticResearchState, waitForAutomaticResearch } = require('./backend-ready.cjs');

const name = 'fixed automatic earnings';
const symbol = 'AAPL.US';
function fixture() {
  return {
    rules: [{ id: 'rule-1', input: { name } }],
    runs: [{ id: 'run-1', rule_id: 'rule-1', status: 'triggered', code: null,
      payload: { auto_research: true, model_requests: 0 } }],
    research_actions: [{ id: 'action-1', run_id: 'run-1', symbol, status: 'dispatched', code: null,
      research_id: '12345678-1234-1234-1234-123456789abc' }],
  };
}

test('automatic research waits for saved rule, monitoring terminal and dispatch terminal separately', () => {
  const view = fixture();
  assert.equal(automaticResearchState({ ...view, rules: [] }, name, symbol).phase, 'waiting-rule');
  assert.equal(automaticResearchState({ ...view, runs: [] }, name, symbol).phase, 'waiting-run');
  view.runs[0].status = 'running';
  assert.equal(automaticResearchState(view, name, symbol).phase, 'running');
  view.runs[0].status = 'triggered';
  assert.equal(automaticResearchState({ ...view, research_actions: [] }, name, symbol).phase, 'waiting-action');
  view.research_actions[0].status = 'claimed';
  assert.equal(automaticResearchState(view, name, symbol).phase, 'claimed');
  view.research_actions[0].status = 'dispatched';
  const ready = automaticResearchState(view, name, symbol);
  assert.equal(ready.phase, 'dispatched');
  assert.equal(ready.run, view.runs[0]);
  assert.equal(ready.action, view.research_actions[0]);
  assert.equal(automaticResearchState(view, 'unrelated rule', symbol).phase, 'waiting-rule');
  assert.equal(automaticResearchState(view, name, 'MSFT.US').phase, 'waiting-action');
});

test('automatic research rejects every wrong monitoring terminal without waiting for success', () => {
  for (const status of ['quiet', 'failed', 'interrupted', 'skipped']) {
    const view = fixture(); view.runs[0].status = status; view.runs[0].code = 'FAILURE_CODE';
    assert.throws(() => automaticResearchState(view, name, symbol), /Monitoring ended as/);
  }
});

test('automatic research rejects failed and uncertain dispatches', () => {
  for (const status of ['failed', 'uncertain']) {
    const view = fixture(); view.research_actions[0].status = status;
    view.research_actions[0].code = 'RESEARCH_DISPATCH_FAILED';
    assert.throws(() => automaticResearchState(view, name, symbol), /Dispatch ended as/);
  }
});

test('automatic research rejects duplicate rule, occurrence and dispatch identities', () => {
  for (const field of ['rules', 'runs', 'research_actions']) {
    const view = fixture(); view[field].push({ ...view[field][0], id: 'duplicate' });
    assert.throws(() => automaticResearchState(view, name, symbol), /exactly one|must not repeat|must not dispatch twice/);
  }
});

test('automatic research requires zero model requests, opt-in and a linked research ID', () => {
  for (const change of [v => { v.runs[0].payload.model_requests = 1; },
    v => { v.runs[0].payload.auto_research = false; },
    v => { v.research_actions[0].research_id = null; },
    v => { v.research_actions[0].code = 'FAILURE_CODE'; }]) {
    const view = fixture(); change(view);
    assert.throws(() => automaticResearchState(view, name, symbol));
  }
});

test('automatic research read-only polling stops immediately on a wrong terminal', async () => {
  let calls = 0; const view = fixture(); view.runs[0].status = 'failed';
  const page = { evaluate: async () => { calls++; return view; } };
  await assert.rejects(waitForAutomaticResearch(page, name, symbol), /Monitoring ended as failed/);
  assert.equal(calls, 1);
});

test('automatic research pending state expires within its explicit budget without starting work', async () => {
  let calls = 0; const view = fixture(); view.runs[0].status = 'running';
  const page = { evaluate: async () => { calls++; return view; } };
  await assert.rejects(waitForAutomaticResearch(page, name, symbol, { timeout: 250 }), /Timeout 250ms/);
  assert.ok(calls >= 1);
  for (const timeout of [0, Infinity, -1, 15001]) {
    await assert.rejects(waitForAutomaticResearch(page, name, symbol, { timeout }), /budget must be bounded/);
  }
});

test('automatic research read-only API failure is not retried or hidden', async () => {
  let calls = 0;
  const page = { evaluate: async () => { calls++; throw new Error('Today API timeout'); } };
  await assert.rejects(waitForAutomaticResearch(page, name, symbol), /Today API timeout/);
  assert.equal(calls, 1);
});
