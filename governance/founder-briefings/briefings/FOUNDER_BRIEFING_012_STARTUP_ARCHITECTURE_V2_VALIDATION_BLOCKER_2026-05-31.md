# Founder Briefing 012 - Startup Architecture V2 Validation Blocker

## What We Investigated
We investigated and implemented Startup Architecture V2 to remove startup routing races, then tested whether the app consistently reaches the correct first screen.

## What We Found
Startup V2 logic is implemented and passed a 20-cycle telemetry test: all 20 launches reached the unauthenticated sign-in route. However, Android visual validation failed because the native launch layer either continued showing the splash image after startup completed or, after rebuild, entered the Expo dev-launcher error activity before JavaScript loaded.

## What This Means For NexusPay
The app-level startup design is materially improved, but NexusPay should not treat Startup V2 as production-certified until the Android native launch layer is fixed and visually re-tested.

## What Users Experience
Based on the current emulator evidence, a user may still see the launch splash or a dev-launcher error instead of the sign-in screen, even when the app logic reports that startup has completed.

## Risk Level
High. The core routing risk is reduced, but the visible launch experience is not yet certifiable.

## Recommended Action
Keep the Startup V2 implementation in place and run a focused native Android remediation pass covering splash release, dev-client launch, clean reinstall, screenshot validation, and a fresh 20-cycle test.

## Decision Required From Founder
Approve a native Android validation remediation pass before Startup V2 is certified complete.

## Estimated Effort
0.5 to 1.5 engineering days, depending on whether the blocker is emulator/dev-client configuration or a native splash integration defect.

## Executive Confidence
Medium. Confidence is high in the Startup V2 application logic because of the 20-cycle pass, but medium overall because visual/native evidence is currently blocking certification.

