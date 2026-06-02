export const recentConsumerTransfers = [
  {
    id: "NXP-2026-004981",
    recipient: "Maria Santos",
    destination: "Philippines",
    amount: "GBP 250.00",
    received: "PHP 18,210",
    status: "Delivered",
    eta: "Delivered in 4 minutes",
  },
  {
    id: "NXP-2026-004877",
    recipient: "Ahmed Khan",
    destination: "UAE",
    amount: "GBP 180.00",
    received: "AED 835",
    status: "Delivered",
    eta: "Delivered in 6 minutes",
  },
];

export const scheduledTransfer = {
  recipient: "Maria Santos",
  amount: "GBP 250.00",
  date: "15 Jun 2026",
  note: "Monthly family support",
};

export const routeOptions = [
  {
    title: "Cheapest",
    subtitle: "Lower fee and more received",
    rate: "1 GBP = 72.84 PHP",
    fee: "GBP 2.80",
    eta: "Usually 10 minutes",
    received: "PHP 18,210",
  },
  {
    title: "Most reliable",
    subtitle: "Best for steady delivery",
    rate: "1 GBP = 72.36 PHP",
    fee: "GBP 3.20",
    eta: "Usually 4 minutes",
    received: "PHP 18,090",
  },
];

export const transferTimeline = [
  { title: "Transfer created", state: "Done", detail: "Reference NXP-2026-004981" },
  { title: "Payment received", state: "Done", detail: "Your funding source was authorised." },
  { title: "Money sent", state: "In progress", detail: "Delivery partner is processing the payout." },
  { title: "Receipt ready", state: "Next", detail: "We will attach the final receipt after delivery." },
];
