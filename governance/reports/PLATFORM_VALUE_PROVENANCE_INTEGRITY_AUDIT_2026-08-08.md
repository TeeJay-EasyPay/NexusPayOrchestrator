# Platform Value Provenance Integrity Audit

Date: 2026-08-08
Scope: active Home, Send, Routes, Funding, Track, OCC, Platform Administration and Nexus AI data paths.

## Executive Conclusion

Before remediation, NexusPay mixed genuine sandbox/testnet execution evidence with legacy demonstration funding, balances, corridor intelligence and mock payout fallbacks. This created a material risk that a user could interpret configured or simulated values as operational facts.

The active payment boundary is now evidence-first. Yapily, Airwallex, XRPL and external FX values retain their true environment labels. Mock provider registration, timer-based card authorisation, synthetic FX fallback and mock payout failover have been removed from active execution. Unsupported values now resolve to `UNAVAILABLE` or `NO_DATA`.

Legacy mock/test modules remain in the repository for isolated engineering tests. They are no longer initialized by the application or shown in OCC. Static personas, recipient examples and bank-name catalogues are user-interface fixtures, not operational telemetry.

## Provenance Standard

| Label | Meaning |
|---|---|
| LIVE | Direct response from a live external service; not necessarily an executable payment quote. |
| SANDBOX | Direct response from a provider sandbox. No real money. |
| TESTNET | Direct blockchain test-network evidence. No real value. |
| DERIVED | Deterministic calculation using cited evidence inputs. |
| ESTIMATED | Provider-supported estimate, visibly non-final. |
| UNAVAILABLE / NO_DATA | Required evidence does not exist. No replacement value is invented. |
| SIMULATED / MOCK / DEMO | Deliberately synthetic test data; prohibited from active payment and health claims. |

## Active Value Lineage Matrix

| Displayed value or status | Active source | Calculation | Freshness | Truth label | Confidence |
|---|---|---|---|---|---|
| Yapily institutions | `nexuspay-open-banking-payment-flow` / Yapily Institutions API | None | Request-time | SANDBOX | High |
| Yapily payment/consent/status | Yapily sandbox API and persisted open-banking flow | Canonical status mapping | Provider response-time | SANDBOX / DERIVED | High |
| FX rate | Frankfurter, ER API, Currency CDN or FloatRates | Provider failover only; no synthetic rate | Request-time | LIVE | High |
| Recipient amount | Canonical Route Plan | Send amount x evidence-backed FX less evidenced costs | Quote timestamp/expiry | DERIVED | Medium-high |
| Airwallex beneficiary schema | Airwallex sandbox API | None | Request-time | SANDBOX | High |
| Airwallex beneficiary/transfer status | Airwallex sandbox API and persisted payout evidence | Canonical status mapping | Provider retrieval time | SANDBOX / DERIVED | High |
| XRPL wallet balances/trustlines | XRPL Testnet JSON-RPC | Drops to XRP conversion only | Request-time ledger | TESTNET | High |
| XRPL path and fee | XRPL Testnet JSON-RPC | Provider ledger response normalization | Request-time ledger | TESTNET | High |
| XRPL completion | Validated ledger transaction | `tesSUCCESS` plus validated ledger | Immutable ledger | TESTNET | High |
| Route score | Canonical Route Plan | Evidence availability and normalized route factors | Quote timestamp/expiry | DERIVED | Medium |
| Provider fees/ETA/limits | Provider response when available | No local substitute | Quote timestamp/expiry | SANDBOX / UNAVAILABLE | Provider-dependent |
| Historical success | Persisted terminal execution sessions | Completed / terminal sessions | Query-time | DERIVED | Medium |
| Settlement duration | Persisted terminal session timestamps | Completed timestamp - created timestamp | Query-time | DERIVED / NO_DATA | Medium |
| OCC platform status | Realtime mode configuration | Diagnostic when subscription disabled | Current app state | DIAGNOSTIC | High |
| OCC network/liquidity | Genuine operational records only | No simulated events or treasury profiles | Query-time | DERIVED / NO_DATA | Medium/low |
| Market hours | Local clock windows | Fixed time-window comparison | Current device time | DERIVED | Low |
| AI summaries | Canonical evidence context only | Model-generated explanation | Request-time | DERIVED / FALLBACK | Medium |
| GBP available balance | No bank account-balance integration | None | N/A | UNAVAILABLE | High |
| Card funding | No tokenisation/acquiring provider | None | N/A | UNAVAILABLE | High |
| Crypto-to-fiat quote | No regulated off-ramp configured | None | N/A | UNAVAILABLE | High |
| Fiat-to-crypto quote | No regulated on-ramp configured | None | N/A | UNAVAILABLE | High |
| Crypto-to-crypto | XRPL platform test wallets | Existing XRPL Testnet execution | Ledger-time | TESTNET | High |

## Remediation Completed

- Removed hard-coded FX rates and the neutral `1.0` fallback.
- Removed the static Visa `4242` source from active payment methods.
- Rejected card funding rather than completing it after a timer.
- Removed startup initialization of mock payout/collection providers.
- Removed mock payout fallback from the execution adapter.
- Removed OCC Provider Sandbox from the operational screen.
- Excluded simulated route events and profile-derived liquidity snapshots from health/OCC calculations.
- Disabled evidence-free Home corridor recommendations and AI operational summaries.
- Replaced fabricated GBP balance and tracking zero fallbacks with `Unavailable`.
- Removed the simulated RLUSD balance from active wallet context.

## Remaining Non-Operational Fixtures

- Static persona names, demo recipients and bank catalogues support navigation/data-entry demonstrations. They do not assert provider availability or transaction success.
- Legacy mock provider, route and treasury modules remain as isolated test assets. They must not be imported by production application entry points.
- Fixed market-hour windows remain visibly `DERIVED` with low confidence; they are not bank-holiday or provider-availability feeds.
- Development/sandbox environment cards remain administrative placeholders and are labelled accordingly.

## Residual Gaps

1. No regulated crypto conversion provider is configured; fiat/crypto journeys cannot execute.
2. No card tokenisation/acquiring provider is configured; card funding is unavailable.
3. No bank account-balance API is used; available fiat balance is unavailable.
4. Actual Airwallex webhook delivery remains unverified; authenticated polling remains the evidenced completion path.
5. XRPL uses backend platform test wallets, not customer-controlled non-custodial wallets.

## Governance Position

NexusPay may demonstrate evidence-backed sandbox and testnet orchestration. It must not describe those flows as production, live money movement, non-custodial customer execution or regulated conversion. The correct description remains: **end-to-end sandbox/testnet orchestration with explicit provenance**.
