import { resolvePayoutPartnerThroughCapabilities } from "../partnerCapabilityResolver";
import { CreatePayoutRequest, PayoutPartnerSelection } from "./payoutTypes";

export function selectBestPayoutPartner(request: CreatePayoutRequest): PayoutPartnerSelection {
  return resolvePayoutPartnerThroughCapabilities(request);
}
