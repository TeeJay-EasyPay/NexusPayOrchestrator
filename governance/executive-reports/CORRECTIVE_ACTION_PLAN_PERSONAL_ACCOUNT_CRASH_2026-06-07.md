# Corrective Action Plan: Personal Account Workspace Crash

Date: 2026-06-07
Owner: Chief Technology Officer

---

## Action 1 — Fix runtime crash in Consumer Home Screen

**Status:** COMPLETED
**File:** app/consumer/index.tsx
**Change:** `const { balances } = useWallet()` → `const { gbpBalance } = useWallet()`
**Change:** `formatGbp(balances.gbp)` → `formatGbp(gbpBalance)`
**Verified:** Lint clean, diagnostics clean.

---

## Action 2 — Stabilize hydrateTransfers reference in TransferContext

**Status:** COMPLETED
**File:** src/state/TransferContext.tsx
**Change:** Changed `async function hydrateTransfers()` to `const hydrateTransfers = useCallback(async () => { ... }, [])`
**Change:** Added `hydrateTransfers` to the dependency array of the auth-state-change `useEffect`
**Import change:** Added `useCallback` to the React import
**Verified:** Lint clean, diagnostics clean. No more eslint exhaustive-deps warning.

---

## Prevention Measures

1. Add a type-assertion or explicit property access to wallet usage in consumer screens to prevent future drift from WalletContext API changes.
2. Any function used as a `useEffect` dependency must be wrapped in `useCallback` (or `useMemo` for objects) — this is a pre-existing React best practice that should be enforced in code review.
3. After any batch of external edits between sessions, run `npx eslint` on all changed files before committing.

---

## Validation Evidence

- `npx eslint app/consumer/index.tsx src/state/TransferContext.tsx` → zero output (no errors, no warnings)
- `get_errors` on both files → No errors found
- Full lint run on all consumer routes and context files → zero output

---

## Scope Confirmation

No changes made to:
- Startup V2 architecture
- Authentication paths
- StartupCoordinator or startupStateMachine
- AccountContext or account scope isolation
- Demo Workspace routes
- Supabase or Nexus AI integration
- EAS configuration
