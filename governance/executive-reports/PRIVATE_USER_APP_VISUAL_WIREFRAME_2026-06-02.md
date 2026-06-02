# Private User App Visual Wireframe

## Date
2026-06-02

## Purpose
Repository-friendly visual wireframe for the private-user NexusPay experience. This is a design artifact, not production UI code.

## Navigation Model

```text
Bottom navigation

+-----------+-----------+-------------+-----------+-----------+
| Home      | Send      | Transfers   | Profile   | Settings  |
+-----------+-----------+-------------+-----------+-----------+
```

Secondary links:
- Nexus AI from Home and Settings
- Verification from Profile and Settings
- Payment Methods from Settings
- Help from Settings

## Home

```text
+----------------------------------------------------------+
| Good afternoon, Tayo                         Personal v  |
| Your money movement is ready                             |
+----------------------------------------------------------+
| Available to send                                       |
| GBP 1,240.00                                             |
| [Send money]                       [Add funding source]  |
+----------------------------------------------------------+
| Nexus AI                                                |
| Your usual Philippines transfer is stable today.         |
| Most Stable is recommended if delivery certainty matters.|
+----------------------------------------------------------+
| Active transfer                                         |
| Maria Santos                         COMPLETED          |
| GBP 250.00 -> PHP                                      |
| [View transfer]                                          |
+----------------------------------------------------------+
| Recent transfers                                        |
| Maria Santos       NXP-2026-004981      Completed       |
| Ahmed Khan         NXP-2026-004877      Completed       |
| [View all transfers]                                    |
+----------------------------------------------------------+
```

## Send Money

```text
+----------------------------------------------------------+
| Send Money                                               |
| Amount                                                   |
| [ GBP 250.00                                      ]       |
+----------------------------------------------------------+
| Recipient                                                |
| [ Maria Santos                                  v ]       |
| Philippines - Bank account                               |
+----------------------------------------------------------+
| Choose route                                             |
| +----------------------+  +----------------------+       |
| | Cheapest             |  | Most Stable          |       |
| | Lower fees           |  | Reliable delivery    |       |
| | Receives PHP 18,210  |  | Receives PHP 18,090  |       |
| +----------------------+  +----------------------+       |
+----------------------------------------------------------+
| Summary                                                  |
| Fee: GBP 3.20                                            |
| Estimated arrival: minutes                               |
| [Continue]                                               |
+----------------------------------------------------------+
```

## Transfers

```text
+----------------------------------------------------------+
| Transfers                                                |
| [ Search recipient, reference, country          ]         |
| [All status] [All corridors] [30 days]                   |
+----------------------------------------------------------+
| Maria Santos                         COMPLETED           |
| GBP -> PHP - Philippines                                |
| NXP-2026-004981                                          |
| [Repeat] [Receipt]                                       |
+----------------------------------------------------------+
| Ahmed Khan                           COMPLETED           |
| GBP -> AED - UAE                                        |
| NXP-2026-004877                                          |
| [Repeat] [Receipt]                                       |
+----------------------------------------------------------+
```

## Profile

```text
+----------------------------------------------------------+
| Profile                                                  |
| Tayo Jehonathan                                          |
| Personal account                                         |
+----------------------------------------------------------+
| Verification                                             |
| Identity verification: Not started                       |
| Transfer limits: Demo/private preview                    |
| [Start verification]                                     |
+----------------------------------------------------------+
| Security                                                 |
| Password: Enabled                                        |
| Trusted devices: 1                                       |
| [Manage security]                                        |
+----------------------------------------------------------+
| Account switcher                                        |
| Personal account                         Active          |
| Family account                           Planned         |
+----------------------------------------------------------+
```

## Settings

```text
+----------------------------------------------------------+
| Settings                                                 |
+----------------------------------------------------------+
| Payment methods                     [Manage]             |
| Nexus AI                            [Manage]             |
| Notifications                       [Manage]             |
| Privacy and data                    [Manage]             |
| Verification                        [Manage]             |
| Help and support                    [Open]               |
+----------------------------------------------------------+
```

## Nexus AI

```text
+----------------------------------------------------------+
| Nexus AI                                                 |
| Helpful guidance for your transfers                      |
+----------------------------------------------------------+
| AI guidance                         [On]                 |
| Tone                                Calm and concise     |
| Detail level                        Balanced             |
+----------------------------------------------------------+
| Where Nexus AI helps                                    |
| Home: transfer readiness                                |
| Send: Cheapest vs Most Stable explanation                |
| Transfers: status explanation and next steps             |
+----------------------------------------------------------+
```

## KYC/XML Verification Placeholder

```text
+----------------------------------------------------------+
| Verification                                             |
| Required before live high-limit transfers                |
+----------------------------------------------------------+
| Identity document                    Later phase         |
| Address check                        Later phase         |
| XML/compliance provider              Later phase         |
+----------------------------------------------------------+
```

## Multi-Account Switcher

```text
+----------------------------------------------------------+
| Switch account                                           |
+----------------------------------------------------------+
| Personal account                         Active          |
| Family account                           Planned         |
| Business account                          Later          |
+----------------------------------------------------------+
| Each account has separate recipients, transfers, limits, |
| payment methods, verification, and permissions.          |
+----------------------------------------------------------+
```

## Visual Principles
- Calm private-user language.
- One primary action per screen.
- No operations telemetry in private flows.
- Cheapest and Most Stable are the only consumer route options.
- Nexus AI explains tradeoffs without exposing internal operational jargon.
