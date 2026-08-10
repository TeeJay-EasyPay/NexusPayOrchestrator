# Founder Briefing: Provider-Neutral Routing

NexusPay now chooses the payout route rather than asking the sender to choose Airwallex or Nium.

The sender enters the recipient's bank details once. NexusPay checks the requirements returned by the connected payout networks, turns those requirements into one clear form, and then prepares the provider-specific information behind the scenes.

The route screen remains the decision point: it shows which route is usable, its evidence and its score. An unavailable provider is not given a misleading score and cannot be selected or used for failover.

Airwallex is currently the executable sandbox payout provider. Nium is connected and supplies genuine sandbox corridor and exchange-rate evidence, but its payout route remains unavailable until Nium provisions the required sandbox customer and wallet. This is deliberate transparency, not a product failure.

Once Nium is fully provisioned, NexusPay can rank it alongside Airwallex and switch to it after a genuine route failure, provided the replacement quote is still valid and the recipient data passes Nium's rules. The route change and reason will remain part of the payment record.

This establishes the intended NexusPay model: senders choose the outcome, while NexusPay evaluates and orchestrates the available providers.
