# Founder Briefing: Supabase User Provisioning and Data Readiness

Date: 2026-06-05  
Branch reviewed: `startup-v2-founder-validation-consumer-multi-account`  
Latest reviewed commit: `43da67b32dfbae4d0c859aeb67c6be8d0d0f0a24`

## 1. Short Answer

No, the Founder should not build the APK right now if the requirement is to access both Demo Workspace and Personal Account successfully.

Demo Workspace login is ready. Personal Account login is not ready because the private-user email and password are not configured.

## 2. What Was Confirmed

The demo Supabase user exists and can sign in.

Confirmed demo account:

```text
Email: demo@nexuspay.app
User id: 4db7a3ef-bbd6-4782-bf0d-65e0200641fa
Purpose: Demo Workspace / Corporate Experience
Status: Active and authenticates successfully
```

The app code routes Demo Workspace correctly:

```text
Multi-Account Preview
  -> Demo Workspace
  -> Corporate Experience
```

## 3. What Is Missing

The Personal Account environment variables are missing:

```text
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

Without those values, the Personal Account button cannot sign in and will show a configuration error.

The private Supabase user also still needs to be created or confirmed in Supabase Auth.

## 4. Data Readiness

After signing in as the demo user, the target Supabase project returned `404 Not Found` for the tables the app expects:

```text
profiles
transfers
recipients
nexus_ai_settings
payment_methods
```

This means authentication is partly ready, but the live data layer is not ready for founder validation.

## 5. Account Isolation

The branch code is doing the right thing for account separation:

- Demo Workspace uses demo account scope.
- Personal Account uses personal account scope.
- Transfers are scoped by Supabase user id and account scope.
- Recipients are scoped by Supabase user id and account scope.
- Nexus AI local settings are scoped by user id and account scope.

The remaining issue is provisioning, not the button routing.

## 6. Required Actions Before APK Build

Before building the APK:

1. Create or confirm the private Supabase Auth user.
2. Add these EAS environment variables for the build environment:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
EXPO_PUBLIC_DEMO_EMAIL
EXPO_PUBLIC_DEMO_PASSWORD
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

3. Apply the missing Supabase tables and RLS policies.
4. Seed at least profile and Nexus AI settings rows for both users.
5. Preferably seed one recipient and one completed transfer for each user so the Founder sees separate demo and personal data immediately.

## 7. Founder Recommendation

Do not generate the Founder Validation APK yet.

Approve a short Supabase provisioning pass first. Once the private user, EAS variables, schema, RLS, and minimum seed data are in place, build from:

```text
startup-v2-founder-validation-consumer-multi-account
```

Use reviewed commit:

```text
43da67b32dfbae4d0c859aeb67c6be8d0d0f0a24
```

## 8. Plain-English Answer

The app can find the Demo Workspace account.

The app cannot yet find the Personal Account account because its email and password are not configured.

The Supabase database also does not yet expose the tables needed for founder-ready profile, transfer, recipient, Nexus AI, and funding-source data.

So the answer is:

```text
No, do not build the APK yet.
```

What is missing:

```text
Private user credentials
Private Supabase Auth user verification
Supabase tables and RLS
Minimum seed data for both accounts
EAS environment variable setup
```
