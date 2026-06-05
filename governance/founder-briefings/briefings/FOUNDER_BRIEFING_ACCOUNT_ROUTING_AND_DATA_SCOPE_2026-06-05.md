# Founder Briefing: Account Routing and Data Scope

Date: 2026-06-05  
Branch: `startup-v2-founder-validation-consumer-multi-account`  
Implementation commit: `4a3f6b2938c140d027218e8d55d6f74d5fe1ade2`

## 1. Decision Summary

Founder Validation account routing has been separated.

The Demo Workspace button now continues to open the corporate demo account. The Personal Account button now signs in with a separate private-user account and opens the consumer app.

## 2. What Changed

Three files changed:

- `src/state/AuthContext.tsx`
- `app/multi-account-preview.tsx`
- `src/services/recipientService.ts`

The Personal Account button no longer uses demo login credentials. It now uses:

```text
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

No real email address or password was added to the codebase.

## 3. Founder Validation Flow

The intended flow is now implemented as:

```text
NexusPay Multi-Account Preview
  -> Demo Workspace
       -> Corporate Experience

NexusPay Multi-Account Preview
  -> Personal Account
       -> Consumer Experience
```

## 4. What Keeps Data Separate

The app now uses two protections:

1. Separate Supabase Auth users for demo and personal validation.
2. Existing account-scope filtering inside the app.

Transfers are already loaded by the current Supabase `user_id` and filtered by account scope. Recipient fallback loading has now been tightened so it also filters by account scope.

## 5. Supabase Setup Required

Before building the next APK, Supabase must contain:

- A demo Auth user matching the demo env vars.
- A private validation Auth user matching the private-user env vars.

The APK build environment must include:

```text
EXPO_PUBLIC_DEMO_EMAIL
EXPO_PUBLIC_DEMO_PASSWORD
EXPO_PUBLIC_PRIVATE_USER_EMAIL
EXPO_PUBLIC_PRIVATE_USER_PASSWORD
```

## 6. Validation Completed

ESLint passed on the touched implementation files and consumer route files.

Credential scanning found only environment-variable references and function parameters. No hardcoded real credentials were introduced.

Full TypeScript still fails because of known pre-existing repository issues outside this change set.

## 7. Risks

If the private-user env vars are missing, the Personal Account button will show a configuration error and will not log in.

If the private Supabase Auth user has not been created, the Personal Account login will fail.

Some consumer screens still use branch validation/static data, so this validates reachability and account routing first, not a fully production-backed personal banking data model.

## 8. Founder Recommendation

Proceed with the next Founder Validation APK build after confirming the private Supabase Auth user and APK build environment variables.

Build from:

```text
startup-v2-founder-validation-consumer-multi-account
```

Use commit:

```text
4a3f6b2938c140d027218e8d55d6f74d5fe1ade2
```

## 9. Plain English Answer

The Demo Workspace and Personal Account no longer open the same account.

Demo Workspace signs into the demo Supabase user and opens the corporate app. Personal Account signs into a separate private Supabase user and opens the consumer app. The build just needs the private-user Supabase credentials supplied through environment variables before the next APK is generated.
