import { mockPayoutProvider } from "./mockPayoutProvider";
import { CreatePayoutRequest } from "./payoutTypes";

export async function createPayout(request: CreatePayoutRequest) {
  return mockPayoutProvider.createPayout(request);
}

export async function getPayoutStatus(reference: string) {
  return mockPayoutProvider.getPayoutStatus(reference);
}