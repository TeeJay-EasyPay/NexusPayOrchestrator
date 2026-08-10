# Founder Briefing - Nium Sandbox Integration

## What Has Changed

NexusPay can now speak directly to the Nium sandbox from its secure backend. On Send, an operator can choose Nium, see the recipient information Nium requires for that country, and receive clear format guidance.

Nium also supplies a sandbox currency-conversion quote. The selected provider and quote are recorded in the same Route Plan used for approval and execution, so the app cannot show Airwallex and silently attempt Nium, or vice versa.

## What Is Proven

- NexusPay authenticates successfully with Nium.
- Nium returns current payout-corridor information.
- Nium returns country-specific recipient requirements.
- Nium returns sandbox exchange-rate quotes.
- Platform Administration can run a real Nium sandbox connectivity test.

## What Is Not Yet Proven

The Nium account currently has no sandbox customer or wallet. Those are the Nium-side accounts from which a test payout is submitted. Until Nium provisions them, NexusPay deliberately labels the route unavailable and will not invent a successful payment.

## Founder Conclusion

This is a **partial pass**. The integration boundary and app experience are ready, and genuine Nium sandbox data is visible. Final beneficiary and payout certification needs Nium to provide the missing sandbox customer and wallet.
