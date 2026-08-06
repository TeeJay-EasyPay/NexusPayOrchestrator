# Yapily Genuine Sandbox Payment Flow Implementation

## Executive Conclusion

NexusPay no longer represents locally configured HSBC, Barclays or Lloyds records as Yapily institutions. Corporate and Private payment journeys now consume only payment-capable institutions returned for the authenticated Yapily application.

The complete direct-API implementation is deployed: payment authorisation, browser consent, secure callback, one-time-token exchange, payment creation, payment status retrieval, persistence and tracking. Certification is currently **PARTIAL PASS** because the Yapily application has no registered sandbox institution. Yapily therefore rejects payment authorisation before the customer consent page.

## Implemented Provider Journey

1. Authenticate to Yapily from a Supabase Edge Function.
2. Retrieve the application's connected UK institutions.
3. Filter to sandbox/mock institutions supporting payment initiation and creation.
4. Persist a unique flow and payment idempotency key.
5. Submit `POST /payment-auth-requests` with the selected provider institution.
6. Open Yapily's provider-issued authorisation URL in the mobile browser.
7. Receive a token-correlated callback through a dedicated Edge Function.
8. Exchange the one-time token without exposing the consent token to the app.
9. Encrypt the consent token with AES-GCM in a service-only table.
10. Submit `POST /payments` using the same durable payment request.
11. Persist provider-issued consent and payment references.
12. Retrieve `GET /payments/{paymentId}` and map the provider status into Track evidence.

## Security And Durability

- Yapily credentials remain in Supabase Secrets.
- The callback accepts no unauthenticated business action without the per-flow callback token.
- Callback tokens are stored only as SHA-256 hashes.
- Consent tokens are encrypted and stored in a table inaccessible to mobile roles.
- Payment idempotency is unique per provider and flow.
- Provider payment references are unique.
- Flow steps are upserted by `(flow_id, step_key)` to prevent duplicate callback evidence.
- Only `SANDBOX` or `MOCK` institutions can be used by this implementation.

## Deployed Evidence

| Check | Result |
|---|---|
| Yapily authentication | PASS |
| Application institution query | HTTP 200 |
| Configured payment institutions | 0 |
| Payment authorisation attempt | Rejected by Yapily before consent |
| Redacted cause | Institution credentials not configured for the application |
| Invalid callback rejection | HTTP 403 |
| Migration | Applied |
| Edge Function deployment | Pass |
| End-user consent/payment creation | Blocked |

## Required External Action

In Yapily Console:

1. Open the NexusPay application.
2. Open **Connected Institutions**.
3. Choose **Add Institutions**.
4. Filter for **Preconfigured Sandbox**.
5. Add and register **Modelo Sandbox** or the Yapily Mock sandbox with payment initiation capability.

Yapily documents that preconfigured sandboxes can be added without bank-specific certificates. Once the institution appears in the application's `GET /institutions` response, NexusPay will display it automatically.

## Validation

- TypeScript: pass.
- ESLint: zero errors; 37 unrelated existing warnings.
- Expo public configuration: pass.
- Edge Function remote bundling: pass.
- Migration application: pass.
- End-to-end provider certification: blocked pending Yapily Console registration.

## Release Decision

No OTA was published. Publishing before a registered Yapily institution exists would remove the old simulated bank choices but would not provide a usable Pay by Bank journey. After Console registration, rerun the Corporate and Private journeys, confirm Track persistence, then publish the OTA.
