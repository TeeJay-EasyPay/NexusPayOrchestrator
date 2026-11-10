// Isolated regression checks: no network, credentials, or payment execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync('src/services/routeIntelligenceService.ts', 'utf8');
const compiled = ts.transpileModule(source + '\nexport { isFresh, capabilityEvidence, providerAvailability };', {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {}, require: () => ({}), Date };
vm.runInNewContext(compiled, context);
const { isFresh, capabilityEvidence, providerAvailability } = context.exports;
const now = new Date().toISOString();
const stale = new Date(Date.now() - 8 * 86400000).toISOString();
assert.equal(isFresh(now), true);
for (const timestamp of [null, 'invalid', stale, new Date(Date.now() + 86400000).toISOString()]) {
  assert.equal(isFresh(timestamp), false);
}
const capability = { provider_id: 'yapily', capability_code: 'PAYMENT_INITIATION', readiness_status: 'Validated', provenance: 'SANDBOX', last_validated_at: stale };
const expired = capabilityEvidence('yapily', 'PAYMENT_INITIATION', [capability], [], now);
assert.equal(expired.value, null);
assert.match(expired.reason, /payment initiation evidence is stale/);
assert.equal(capabilityEvidence('yapily', 'PAYMENT_INITIATION', [{ ...capability, last_validated_at: now }], [], now).value, true);
const execution = { state: 'COMPLETED', completed_at: stale, snapshot: { payout: { providerId: 'AIRWALLEX_SANDBOX' } } };
assert.equal(capabilityEvidence('airwallex', 'TRANSFER_CREATION', [], [execution], now).value, null);
assert.equal(capabilityEvidence('airwallex', 'TRANSFER_CREATION', [], [{ ...execution, completed_at: null }], now).value, null);
assert.equal(capabilityEvidence('airwallex', 'TRANSFER_CREATION', [], [{ ...execution, completed_at: now }], now).value, true);
assert.equal(providerAvailability('Airwallex', { status: 'SUCCESS', tested_at: stale }).value, 'UNAVAILABLE');
assert.equal(providerAvailability('Airwallex', { status: 'FAILED', tested_at: now }).value, 'UNAVAILABLE');
assert.equal(providerAvailability('Airwallex', { status: 'SUCCESS', tested_at: now }).value, 'AVAILABLE');
console.log('PASS: route evidence freshness, capability diagnostics, and completed-execution fallback');
