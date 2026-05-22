# Nexus AI Edge Function Deployment Guide

This guide covers secret setup, local testing, and production deployment for `nexus-ai`.

## 1. Create Supabase Secrets

Set the OpenAI API key in Supabase (never in the mobile app):

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

Optional model override:

```bash
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

Verify secrets:

```bash
supabase secrets list
```

## 2. Local Testing

1. Start Supabase locally:

```bash
supabase start
```

2. Serve the function:

```bash
supabase functions serve nexus-ai --env-file supabase/.env.local
```

3. Add local secret to `supabase/.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

4. Invoke locally:

```bash
curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/nexus-ai' \
  --header 'Content-Type: application/json' \
  --data '{
    "action": "dashboard_summary",
    "screenContext": "home",
    "sensitivity": "balanced",
    "payload": {
      "telemetry": {
        "treasuryStatus": "Healthy",
        "liquidityStatus": "Strong",
        "corridorHealth": "GBP -> PHP strongest",
        "networkHealth": "Healthy",
        "fxStatus": "Live",
        "marketStatus": "Operational"
      }
    }
  }'
```

## 3. Deploy to Production

Deploy function:

```bash
supabase functions deploy nexus-ai
```

Ensure production secrets are set in the target project:

```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
supabase secrets set OPENAI_MODEL=gpt-4.1-mini
```

## 4. Mobile Integration Expectations

- Mobile app calls only `supabase.functions.invoke("nexus-ai")`.
- Mobile app never reads or stores `OPENAI_API_KEY`.
- If the function fails, mobile service returns fallback advisory content.
- Core routing, transfer execution, telemetry, and wallet workflows remain operational without AI.

## 5. Operational Notes

- Treat AI outputs as advisory only.
- Keep retries and timeouts conservative to avoid blocking UI workflows.
- Monitor function logs for payload validation errors and provider failures.
