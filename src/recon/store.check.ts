import { balancingTransferAmount, seed } from './data.ts';
import { createReconStore, findAuto, findCandidates, fmtDate, fmtMoney, summarize } from './store.ts';

// Deliberately dependency-free: this also type-checks with only --lib es2023.
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal(actual: unknown, expected: unknown, message: string): void {
  assert(Object.is(actual, expected), `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function structurallyEqual(actual: unknown, expected: unknown): boolean {
  if (Object.is(actual, expected)) return true;
  if (actual === null || expected === null || typeof actual !== 'object' || typeof expected !== 'object') {
    return false;
  }
  if (Array.isArray(actual) !== Array.isArray(expected)) return false;
  const left = actual as Record<string, unknown>;
  const right = expected as Record<string, unknown>;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return leftKeys.length === rightKeys.length
    && leftKeys.every((key, index) => key === rightKeys[index] && structurallyEqual(left[key], right[key]));
}

function deepEqual(actual: unknown, expected: unknown, message: string): void {
  assert(structurallyEqual(actual, expected), `${message}: structures differ`);
}

function ok(result: { ok: boolean; reason?: string }, message: string): void {
  assert(result.ok, `${message}: ${result.reason ?? 'action failed'}`);
}

function sum(values: number[]): number {
  return values.reduce((total, amount) => total + amount, 0);
}

type Store = ReturnType<typeof createReconStore>;

function exceptionIds(store: Store): string[] {
  return Object.values(store.getState().items)
    .filter(item => item.kind === 'exception')
    .map(item => item.id)
    .sort();
}

function resolveAll(store: Store, last = false, skip: string[] = []): void {
  for (const itemId of exceptionIds(store)) {
    if (skip.includes(itemId)) continue;
    const item = store.getState().items[itemId];
    const suggestion = item.suggestions[last ? item.suggestions.length - 1 : 0];
    assert(suggestion, `${itemId} has a visible suggestion`);
    ok(store.accept(itemId, suggestion.id), `accept ${itemId}`);
    if (suggestion.approval) {
      equal(store.getState().items[itemId].status, 'awaiting_approval', `${itemId} is approval-gated`);
      ok(store.approve(itemId), `approve ${itemId}`);
    }
  }
}

function checkSeed(): void {
  const state = createReconStore().getState();
  const bank = Object.values(state.bankLines);
  const books = Object.values(state.bookLines);
  const items = Object.values(state.items);
  const auto = items.filter(item => item.kind === 'auto');
  const exceptions = items.filter(item => item.kind === 'exception');
  equal(bank.length, 219, 'statement line count');
  equal(auto.length, 207, 'auto item count');
  equal(exceptions.length, 14, 'exception item count');
  equal(state.statementOpening, 941_288_643, 'statement opening');
  equal(state.statementEnding, 894_731_658, 'statement ending');
  equal(state.previousReconciledEnding, 941_288_643, 'prior reconciled ending');
  equal(state.glOpeningBalance, 941_403_643, 'current August GL balance');
  equal(state.glBalance, 903_005_789, 'September GL balance');
  equal(sum(bank.map(line => line.amount)), state.statementEnding - state.statementOpening, 'statement movement');
  equal(sum(bank.filter(line => state.items[line.itemId].kind === 'exception').map(line => line.amount)), 4_231_911, 'exception bank sum');
  equal(sum(books.filter(line => state.items[line.itemId].kind === 'exception').map(line => line.amount)), 12_391_042, 'exception book sum');
  equal(sum(bank.filter(line => state.items[line.itemId].kind === 'auto').map(line => line.amount)), -50_788_896, 'auto bank sum');
  equal(sum(books.filter(line => state.items[line.itemId].kind === 'auto').map(line => line.amount)), -50_788_896, 'auto book sum');
  equal(sum(books.map(line => line.amount)), state.glBalance - state.glOpeningBalance, 'book movement');
  assert(balancingTransferAmount < 0, 'balancing savings transfer is outgoing');
  assert(Math.abs(balancingTransferAmount) >= 500_000 && Math.abs(balancingTransferAmount) <= 40_000_000, 'balancing transfer is within $5,000–$400,000');
  for (const line of [...bank, ...books]) assert(Number.isSafeInteger(line.amount), `${line.id} uses integer cents`);
  for (const line of books) assert(/^\d{7}$/.test(line.journal), `${line.id} has a seven-digit journal`);
  for (const item of auto) {
    equal(item.status, 'resolved', `${item.id} starts matched`);
    equal(item.bankIds.length, 1, `${item.id} has one bank line`);
    equal(item.bookIds.length, 1, `${item.id} has one book line`);
    const bankLine = state.bankLines[item.bankIds[0]];
    const bookLine = state.bookLines[item.bookIds[0]];
    equal(bankLine.amount, bookLine.amount, `${item.id} amounts agree`);
    assert(item.confidence !== undefined && item.confidence >= 95 && item.confidence <= 100, `${item.id} confidence range`);
    assert(item.matchedBy === 'rule' || item.matchedBy === 'ai', `${item.id} matcher provenance`);
    for (const line of [bankLine, bookLine]) {
      assert(/^2026-09-\d{2}$/.test(line.date), `${line.id} is in September`);
      const weekday = new Date(`${line.date}T12:00:00Z`).getUTCDay();
      assert(weekday > 0 && weekday < 6, `${line.id} is on a weekday`);
    }
    const dayGap = (new Date(`${bankLine.date}T12:00:00Z`).getTime() - new Date(`${bookLine.date}T12:00:00Z`).getTime()) / 86_400_000;
    assert(dayGap >= 0 && dayGap <= 2, `${item.id} book date is zero to two days earlier`);
  }
  const ruleShare = auto.filter(item => item.matchedBy === 'rule').length / auto.length;
  assert(ruleShare >= 0.6 && ruleShare <= 0.8, 'roughly 70% of automatic matches use rules');
  equal(Object.keys(state.threads).length, 4, 'four seeded threads');
  for (const thread of Object.values(state.threads)) {
    for (const message of thread.messages) assert(message.at.endsWith('-04:00'), 'thread timestamps include New York offset');
  }
  const initial = summarize(state);
  equal(initial.difference, -8_274_131, 'initial difference');
  equal(initial.open, 14, 'initial open count');
  equal(initial.autoMatched, 207, 'initial auto-matched count');
  equal(initial.awaitingApproval, 0, 'initial awaiting count');
  equal(initial.done, false, 'initial completion');
}

function checkSuggestions(): void {
  const state = createReconStore().getState();
  const targets: Record<string, number> = {
    r01: 93, r02: 97, r03: 98, r04: 72, r05: 90, r06: 95, r07: 88,
    r08: 84, r09: 89, r10: 91, r11: 92, r12: 95, r13: 96, r14: 90,
  };
  for (const item of Object.values(state.items)) {
    if (item.kind === 'exception') equal(item.suggestions[0].confidence, targets[item.id], `${item.id} top confidence`);
    const baseline = item.suggestions[0];
    for (const suggestion of [...item.suggestions, ...item.hidden]) {
      equal(suggestion.itemId, item.id, `${suggestion.id} item reference`);
      assert(suggestion.reasoning.length <= 110 && !suggestion.reasoning.includes('\n'), `${suggestion.id} reasoning is one concise line`);
      assert(Math.abs(sum(suggestion.factors.map(factor => factor.weight)) - 1) <= 1e-9, `${suggestion.id} factor weights sum to one`);
      for (const factor of suggestion.factors) {
        assert(factor.score >= 0 && factor.score <= 1, `${suggestion.id} factor score range`);
        assert(factor.weight >= 0 && factor.weight <= 1, `${suggestion.id} factor weight range`);
      }
      equal(suggestion.confidence, Math.round(100 * sum(suggestion.factors.map(factor => factor.weight * factor.score))), `${suggestion.id} computed confidence`);
      equal(suggestion.bookDelta, baseline.bookDelta, `${item.id} all candidates have the same book effect`);
      equal(suggestion.inTransit ?? 0, baseline.inTransit ?? 0, `${item.id} all candidates have the same in-transit effect`);
      equal(suggestion.outstanding ?? 0, baseline.outstanding ?? 0, `${item.id} all candidates have the same outstanding effect`);
      assert(Number.isSafeInteger(suggestion.bookDelta), `${suggestion.id} cash effect uses integer cents`);
      for (const id of suggestion.bankIds) assert(state.bankLines[id], `${suggestion.id} bank reference exists`);
      for (const id of suggestion.bookIds) assert(state.bookLines[id], `${suggestion.id} book reference exists`);
      for (const id of suggestion.attachmentIds ?? []) assert(state.attachments[id], `${suggestion.id} attachment reference exists`);
      if (suggestion.entries) {
        equal(sum(suggestion.entries.map(line => line.debit)), sum(suggestion.entries.map(line => line.credit)), `${suggestion.id} journal balances`);
        for (const line of suggestion.entries) {
          assert(Number.isSafeInteger(line.debit) && Number.isSafeInteger(line.credit), `${suggestion.id} journal uses integer cents`);
          assert(line.debit >= 0 && line.credit >= 0, `${suggestion.id} journal amounts are nonnegative`);
        }
      }
    }
  }
  for (const attachment of Object.values(state.attachments)) {
    if (attachment.total !== undefined) assert(Number.isSafeInteger(attachment.total), `${attachment.id} total uses integer cents`);
    for (const line of attachment.lines) if (line.amount !== undefined) assert(Number.isSafeInteger(line.amount), `${attachment.id} line uses integer cents`);
  }
}

function checkResolutionAndUndo(): void {
  const store = createReconStore();
  const initial = summarize(store.getState());
  resolveAll(store);
  const final = summarize(store.getState());
  equal(final.difference, 0, 'top choices eliminate the difference');
  equal(final.open, 0, 'all top choices resolve');
  equal(final.resolved, 14, 'all exception items count as resolved');
  equal(final.awaitingApproval, 0, 'all approvals complete');
  equal(final.done, true, 'top choices finish reconciliation');
  equal(final.inTransit, 8_640_000, 'deposit in transit');
  equal(final.outstanding, 385_000, 'outstanding check');
  equal(final.bookAdjustments, -19_131, 'net book adjustments');
  equal(final.adjustedBank, 902_986_658, 'final adjusted bank');
  equal(final.adjustedBook, 902_986_658, 'final adjusted book');
  const actions = [...store.getState().actions];
  equal(actions.length, 16, 'fourteen accepts and two approvals are logged');
  equal(actions[0].at, '2026-10-05T09:00:00-04:00', 'fake action clock starts at nine');
  for (let index = 1; index < actions.length; index++) {
    assert(new Date(actions[index].at).getTime() > new Date(actions[index - 1].at).getTime(), 'action timestamps are strictly monotonic');
  }
  for (const action of actions.reverse()) ok(store.revert(action.id), `revert ${action.id}`);
  deepEqual(summarize(store.getState()), initial, 'reverting all actions restores the initial summary');
  const alternate = createReconStore();
  resolveAll(alternate, true);
  equal(summarize(alternate.getState()).difference, 0, 'last visible choices eliminate the difference');
  equal(summarize(alternate.getState()).done, true, 'last visible choices finish reconciliation');
}

function checkAutoUnreconcile(): void {
  const store = createReconStore();
  const auto = Object.values(store.getState().items).find(item => item.kind === 'auto');
  assert(auto, 'an auto match exists');
  ok(store.unreconcile(auto.id), 'unreconcile auto pair');
  equal(summarize(store.getState()).open, 15, 'unreconciled auto pair joins review queue');
  equal(summarize(store.getState()).autoMatched, 206, 'unreconciled auto pair leaves auto count');
  const reopened = store.getState().items[auto.id];
  equal(reopened.suggestions.length, 1, 'original automatic match remains the only candidate');
  ok(store.accept(auto.id, reopened.suggestions[0].id), 'reaccept auto pair');
  equal(summarize(store.getState()).open, 14, 'reaccepted auto pair leaves review queue');
  equal(summarize(store.getState()).autoMatched, 207, 'automatic match count restored');
}

function checkApprovalAndReopening(): void {
  const store = createReconStore();
  const initial = summarize(store.getState());
  const northstar = store.getState().items.r08;
  ok(store.accept(northstar.id, northstar.suggestions[0].id), 'route Northstar adjustment for approval');
  const pending = summarize(store.getState());
  equal(pending.awaitingApproval, 1, 'pending approval has a separate count');
  equal(pending.open, 13, 'pending approval leaves open review queue');
  equal(pending.resolved, 0, 'pending approval does not count as resolved');
  equal(pending.difference, initial.difference, 'pending approval has no cash effect');
  const beforeUnauthorized = store.getState();
  equal(store.approve('r08', 'maya').ok, false, 'preparer cannot approve controller-gated adjustment');
  equal(store.approve('r08', 'ember').ok, false, 'agent cannot approve controller-gated adjustment');
  assert(store.getState() === beforeUnauthorized, 'unauthorized approvals do not mutate state');
  const approval = store.approve('r08');
  assert(approval.ok, 'controller approves Northstar');
  equal(summarize(store.getState()).bookAdjustments, -2_500, 'approval activates adjustment');
  ok(store.revert(approval.actionId), 'revert controller approval');
  deepEqual(summarize(store.getState()), pending, 'reverting approval restores pending summary');
  ok(store.unreconcile('r08'), 'reopen pending Northstar item');
  deepEqual(summarize(store.getState()), initial, 'reopening pending item restores initial summary');
  const interest = store.getState().items.r03;
  ok(store.accept(interest.id, interest.suggestions[0].id), 'record interest adjustment');
  const adjusted = summarize(store.getState());
  const reopen = store.unreconcile('r03');
  assert(reopen.ok, 'reopen resolved interest item');
  deepEqual(summarize(store.getState()), initial, 'reopening resolved item removes adjustment');
  ok(store.revert(reopen.actionId), 'revert interest reopening');
  deepEqual(summarize(store.getState()), adjusted, 'reverting reopening restores adjustment');

  const edited = createReconStore();
  ok(edited.accept('r08', northstar.suggestions[0].id), 'route adjustment before an amount edit');
  ok(edited.editField({ side: 'book', id: northstar.bookIds[0] }, 'amount', 4_799_999), 'edit pending payment amount');
  equal(edited.getState().items.r08.status, 'open', 'pending amount edit reopens item');
  equal(edited.approve('r08').ok, false, 'stale approval cannot be applied after amount edit');
  equal(edited.accept('r08', northstar.suggestions[0].id).ok, false, 'stale candidate cannot be accepted after amount edit');
}

function checkManualMatching(): void {
  const store = createReconStore();
  const cascade = store.getState().items.r12;
  equal(store.matchSelected([...cascade.bankIds, ...cascade.bankIds], cascade.bookIds).ok, false, 'duplicate selected bank line is rejected');
  ok(store.matchSelected(cascade.bankIds, cascade.bookIds), 'match Cascade remittance to three invoices');
  equal(store.getState().items.r12.status, 'resolved', 'Cascade resolves');
  equal(store.getState().items.r12.resolution?.source, 'maya', 'manual match is attributed to Maya');
  const aws = store.getState().items.r07;
  const mismatch = store.matchSelected(aws.bankIds, aws.bookIds);
  equal(mismatch.ok, false, 'unequal manual match fails');
  equal(mismatch.delta, 18_000, 'AWS mismatch is $180');
  if (!mismatch.ok) assert(mismatch.reason.includes('$180.00'), 'mismatch message formats the difference');

  const initial = store.getState();
  const contractors = initial.items.r13;
  const chenBank = contractors.bankIds.find(id => initial.bankLines[id].description.toUpperCase().includes('CHEN'));
  const okaforBank = contractors.bankIds.find(id => initial.bankLines[id].description.toUpperCase().includes('OKAFOR'));
  const chenBook = contractors.bookIds.find(id => initial.bookLines[id].description.includes('Lin Chen'));
  const okaforBook = contractors.bookIds.find(id => initial.bookLines[id].description.includes('Emeka Okafor'));
  assert(chenBank && okaforBank && chenBook && okaforBook, 'all contractor lines exist');
  ok(store.matchSelected([chenBank], [chenBook]), 'pair Chen by name');
  equal(store.getState().items.r13.status, 'open', 'first contractor pairing leaves item open');
  equal(store.getState().items.r13.pairings.length, 1, 'first contractor pairing is recorded');
  const afterFirstPair = store.getState();
  equal(store.matchSelected([chenBank], [chenBook]).ok, false, 'already-paired lines cannot be reused');
  assert(store.getState() === afterFirstPair, 'reusing paired lines does not mutate state');
  ok(store.matchSelected([okaforBank], [okaforBook]), 'pair Okafor by name');
  equal(store.getState().items.r13.status, 'resolved', 'second contractor pairing resolves item');
  equal(store.getState().items.r13.pairings.length, 2, 'both contractor pairings are recorded');
  const wrong = createReconStore();
  const result = wrong.matchSelected([chenBank], [okaforBook]);
  ok(result, 'equal amount contractor mispair is allowed');
  if (result.ok) equal(result.warning, 'Payee names differ', 'contractor mispair warns');

  const fix = createReconStore();
  const awsBook = fix.getState().items.r07.bookIds[0];
  ok(fix.editField({ side: 'book', id: awsBook }, 'amount', -1_824_000), 'correct AWS amount by hand');
  equal(summarize(fix.getState()).glBalance, 903_023_789, 'manual book amount edit changes GL by $180');
  const corrected = fix.getState().items.r07;
  ok(fix.matchSelected(corrected.bankIds, corrected.bookIds), 'match corrected AWS payment');
  equal(fix.getState().items.r07.resolution?.bookDelta, 0, 'manual match adds no second cash adjustment');
  resolveAll(fix, false, ['r07']);
  equal(summarize(fix.getState()).difference, 0, 'hand-corrected AWS path balances');
}

function checkCrossItemMatching(): void {
  const googleBank = seed.items.r01.bankIds[0];
  const googleBook = seed.items.r01.bookIds[0];
  const awsBank = seed.items.r07.bankIds[0];
  const awsBook = seed.items.r07.bookIds[0];
  const amount = seed.bankLines[googleBank].amount;
  const custom = {
    ...seed,
    statementEnding: seed.statementEnding + amount - seed.bankLines[awsBank].amount,
    glBalance: seed.glBalance + amount - seed.bookLines[awsBook].amount,
    bankLines: { ...seed.bankLines, [awsBank]: { ...seed.bankLines[awsBank], amount } },
    bookLines: { ...seed.bookLines, [awsBook]: { ...seed.bookLines[awsBook], amount } },
  };
  const store = createReconStore(custom);
  ok(store.matchSelected([googleBank], [awsBook]), 'first cross-item pairing succeeds');
  equal(store.getState().items.r01.status, 'open', 'partially paired first item stays open');
  equal(store.getState().items.r07.status, 'open', 'partially paired second item stays open');
  ok(store.matchSelected([awsBank], [googleBook]), 'second cross-item pairing succeeds');
  equal(store.getState().items.r01.status, 'resolved', 'all lines of first cross-matched item resolve');
  equal(store.getState().items.r07.status, 'resolved', 'all lines of second cross-matched item resolve');
  const reopening = store.unreconcile('r01');
  assert(reopening.ok, 'reopen a cross-matched item');
  equal(store.getState().items.r07.status, 'open', 'connected cross-matched item also reopens');
  equal(store.getState().items.r07.pairings.length, 0, 'reopening removes dependent pairings');
  ok(store.revert(reopening.actionId), 'revert cross-item reopening');
  equal(store.getState().items.r01.status, 'resolved', 'undo restores first cross-matched item');
  equal(store.getState().items.r07.status, 'resolved', 'undo restores second cross-matched item');
  store.reset();
  deepEqual(store.getState(), custom, 'reset restores the supplied custom seed');
}

function checkRevertDependencies(): void {
  const store = createReconStore();
  const item = store.getState().items.r01;
  const accepted = store.accept(item.id, item.suggestions[0].id);
  assert(accepted.ok, 'Google acceptance succeeds');
  ok(store.editField({ side: 'book', id: item.bookIds[0] }, 'memo', 'Verified against invoice'), 'edit Google book memo');
  const blocked = store.revert(accepted.actionId);
  equal(blocked.ok, false, 'later same-item edit blocks reverting acceptance');
  if (!blocked.ok) assert(blocked.reason.length > 0, 'blocked revert explains dependency');
  const edit = store.getState().actions.at(-1);
  assert(edit, 'edit action exists');
  ok(store.revert(edit.id), 'revert dependent edit');
  ok(store.revert(accepted.actionId), 'accept can revert after dependent edit is reverted');
  equal(store.getState().items.r01.status, 'open', 'Google returns to open');

  const independent = createReconStore();
  const google = independent.getState().items.r01;
  const first = independent.accept(google.id, google.suggestions[0].id);
  assert(first.ok, 'first independent action succeeds');
  const fee = independent.getState().items.r02;
  ok(independent.accept(fee.id, fee.suggestions[0].id), 'second independent action succeeds');
  ok(independent.revert(first.actionId), 'later unrelated action does not block revert');
  equal(independent.getState().items.r01.status, 'open', 'independent revert restores target item');
  equal(independent.getState().items.r02.status, 'resolved', 'independent revert preserves unrelated item');
  equal(summarize(independent.getState()).bookAdjustments, -28_540, 'independent revert preserves unrelated cash adjustment');

  const edits = createReconStore();
  const googleBook = edits.getState().bookLines[google.bookIds[0]];
  const awsBook = edits.getState().bookLines[edits.getState().items.r07.bookIds[0]];
  const firstEdit = edits.editField({ side: 'book', id: googleBook.id }, 'amount', googleBook.amount + 100);
  assert(firstEdit.ok, 'first independent amount edit succeeds');
  ok(edits.editField({ side: 'book', id: awsBook.id }, 'amount', awsBook.amount + 200), 'second independent amount edit succeeds');
  equal(edits.getState().glBalance, seed.glBalance + 300, 'both book edits affect GL');
  ok(edits.revert(firstEdit.actionId), 'revert first disjoint book edit');
  equal(edits.getState().glBalance, seed.glBalance + 200, 'reversion preserves other GL delta');
  equal(edits.getState().bookLines[googleBook.id].amount, googleBook.amount, 'reversion restores target book amount');
  equal(edits.getState().bookLines[awsBook.id].amount, awsBook.amount + 200, 'reversion preserves unrelated book amount');
}

function checkAgentAndLookup(): void {
  const store = createReconStore();
  const before = store.getState();
  const invoiceSearch = findCandidates(before, 'NTN-88213');
  equal(invoiceSearch.length, 1, 'candidate lookup finds hidden invoice number');
  equal(findCandidates(before, { itemId: 'r04', includeHidden: false }).length, 2, 'visible-only lookup omits hidden candidate');
  equal(findCandidates(before, { itemId: 'r04', text: 'unprocessed' }).length, 1, 'candidate lookup searches attachment text');
  deepEqual(store.findCandidates('r04'), findCandidates(before, 'r04'), 'store candidate lookup delegates to pure helper');
  assert(store.getState() === before, 'pure candidate lookup does not surface documents');
  const candidates = store.ember.search('r04');
  equal(candidates.length, 1, 'Ember finds one Notion candidate');
  const candidate = candidates[0];
  equal(candidate.source, 'ember', 'hidden candidate comes from Ember');
  equal(candidate.confidence, 96, 'invoice-backed Notion confidence');
  assert(store.getState().items.r04.surfacedIds.includes(candidate.id), 'search marks candidate surfaced');
  assert(!before.items.r04.surfacedIds.includes(candidate.id), 'search preserves old snapshot');
  assert((candidate.attachmentIds ?? []).some(id => store.getState().attachments[id].number === 'NTN-88213'), 'candidate links Notion invoice NTN-88213');
  equal(store.ember.search('r01').length, 0, 'other items have no hidden candidates');
  ok(store.addSuggestion('r04', candidate), 'surface Notion candidate');
  ok(store.accept('r04', candidate.id), 'accept invoice-backed Notion candidate');
  equal(store.getState().items.r04.status, 'resolved', 'Notion resolves with discovered invoice');
  equal(store.getState().items.r04.resolution?.bookDelta, -960_000, 'Notion adjustment is $9,600 out');
  const stripe = findAuto(store.getState(), { date: '2026-09-28', text: 'stripe' });
  equal(stripe.length, 1, 'exactly one Stripe payout on September 28');
  const line = store.getState().bankLines[stripe[0].bankIds[0]];
  assert(/^STRIPE TRANSFER ST-/.test(line.description), 'Stripe bank description includes transfer reference');
  const book = store.getState().bookLines[stripe[0].bookIds[0]];
  equal(book.description, 'Stripe payout 9/28', 'Stripe book description is human-readable');
  deepEqual(findAuto(store.getState(), { date: '2026-09-28', text: 'StRiPe' }), stripe, 'automatic lookup is case insensitive');
  deepEqual(store.findAuto({ date: '2026-09-28', text: 'stripe' }), stripe, 'store automatic lookup delegates to pure helper');
}

function checkCreateEntry(): void {
  const correct = createReconStore();
  ok(correct.createEntry('r02', { account: '6820 · Bank Service Charges', amount: -28_540 }), 'create correct bank fee JE');
  equal(correct.getState().items.r02.status, 'resolved', 'created JE resolves bank-only item');
  equal(correct.getState().items.r02.resolution?.bookDelta, -28_540, 'created JE cash effect');
  resolveAll(correct, false, ['r02']);
  equal(summarize(correct.getState()).difference, 0, 'correct created JE balances');
  equal(summarize(correct.getState()).done, true, 'correct created JE completes reconciliation');
  const wrong = createReconStore();
  ok(wrong.createEntry('r02', { account: '6820 · Bank Service Charges', amount: -28_000 }), 'create deliberately incorrect bank fee JE');
  equal(wrong.getState().items.r02.status, 'resolved', 'incorrect created JE still resolves item');
  resolveAll(wrong, false, ['r02']);
  // The brief says +540 here, but its bank-minus-book convention gives -540:
  // the smaller expense leaves adjusted book $5.40 higher than adjusted bank.
  equal(summarize(wrong.getState()).difference, -540, 'incorrect created JE leaves a negative $5.40 difference');
  equal(summarize(wrong.getState()).done, false, 'nonzero difference prevents completion');
}

function checkImmutabilityAndActions(): void {
  const store = createReconStore();
  const original = store.getState();
  deepEqual(original, createReconStore().getState(), 'fresh stores are deterministic');
  deepEqual(original, seed, 'exported seed matches fresh store');
  let notifications = 0;
  const unsubscribe = store.subscribe(() => { notifications += 1; });
  const google = original.items.r01;
  ok(store.accept(google.id, google.suggestions[0].id), 'accept for immutability check');
  assert(store.getState() !== original, 'mutations replace root state');
  equal(original.items.r01.status, 'open', 'old item snapshot is unchanged');
  equal(original.actions.length, 0, 'old action array is unchanged');
  equal(notifications, 1, 'subscriber notified once');
  unsubscribe();
  ok(store.unreconcile('r01'), 'unreconcile after unsubscribe');
  equal(notifications, 1, 'unsubscribed listener stays silent');
  store.reset();
  deepEqual(store.getState(), original, 'reset restores exact initial state');
  deepEqual(createReconStore().getState(), original, 'mutating one store preserves default seed');

  const fees = store.getState().items.r02;
  const reject = store.reject(fees.id, fees.suggestions[0].id);
  assert(reject.ok, 'reject succeeds');
  assert(!store.getState().items.r02.suggestions.some(candidate => candidate.id === fees.suggestions[0].id), 'reject hides candidate');
  ok(store.revert(reject.actionId), 'revert rejection');
  deepEqual(store.getState().items.r02.suggestions, fees.suggestions, 'revert restores rejected candidate');
  const remove = store.removeSuggestion(fees.id, fees.suggestions[1].id);
  assert(remove.ok, 'remove candidate succeeds');
  assert(!store.getState().items.r02.suggestions.some(candidate => candidate.id === fees.suggestions[1].id), 'removed candidate is absent');
  ok(store.revert(remove.actionId), 'revert removal');
  deepEqual(store.getState().items.r02.suggestions, fees.suggestions, 'revert restores removed candidate');

  const invalidState = store.getState();
  equal(store.accept('missing', 'missing').ok, false, 'unknown item fails gracefully');
  equal(store.editField({ side: 'book', id: google.bookIds[0] }, 'amount', 1.5).ok, false, 'fractional cents rejected');
  equal(store.matchSelected([], []).ok, false, 'empty manual match rejected');
  const voidCandidate = invalidState.items.r14.suggestions[0];
  equal(store.addSuggestion('r14', { ...voidCandidate, id: 'r14-incorrect-cash', bookDelta: 0 }).ok, false, 'zero-line item cannot invent a different cash effect');
  equal(store.addSuggestion('r01', { ...google.suggestions[0], id: 'r01-invented-transit', bookDelta: 1_000, inTransit: 1_000 }).ok, false, 'ordinary match cannot invent an in-transit offset');
  assert(store.getState() === invalidState, 'failed actions do not mutate state');
}

function checkFormatting(): void {
  equal(fmtMoney(-123_456), '($1,234.56)', 'money defaults to parentheses');
  equal(fmtMoney(-123_456, { sign: 'minus' }), '-$1,234.56', 'minus money format');
  equal(fmtMoney(123_456, { sign: 'plus' }), '+$1,234.56', 'explicit positive money format');
  equal(fmtMoney(0), '$0.00', 'zero money format');
  equal(fmtDate('2026-09-16'), 'Sep 16', 'short date format');
  equal(fmtDate('2026-09-16', 'numeric'), '9/16/2026', 'numeric date format');
  equal(fmtDate('2026-09-16', 'long'), 'September 16, 2026', 'long date format');
}

checkSeed();
checkSuggestions();
checkResolutionAndUndo();
checkAutoUnreconcile();
checkApprovalAndReopening();
checkManualMatching();
checkCrossItemMatching();
checkRevertDependencies();
checkAgentAndLookup();
checkCreateEntry();
checkImmutabilityAndActions();
checkFormatting();

(globalThis as unknown as { console: { log(message: string): void } }).console.log('ALL CHECKS PASSED');
