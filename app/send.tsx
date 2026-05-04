// ONLY SHOWING KEY ADDITIONS - assume imports added at top

import { useEffect, useMemo, useState } from "react";
import { loadSavedRecipients } from "../src/services/recipientService";
import { SavedRecipient } from "../src/types/recipient";
import { SavedRecipientsCard } from "../src/components/recipients/SavedRecipientsCard";

// inside component
const [savedRecipients, setSavedRecipients] = useState<SavedRecipient[]>([]);

useEffect(() => {
  loadSavedRecipients().then(setSavedRecipients);
}, []);

const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
  setSelectedCountry(recipient.country);
  setSelectedPayoutMethod(recipient.payoutMethod);

  if (recipient.payoutMethod === "BANK") {
    setSelectedProvider(recipient.bankName || "");
    setBankCode(recipient.bankCode || "");
    setAccountNumber(recipient.accountNumber || "");
    setMobileNumber("");
  } else {
    setSelectedProvider(recipient.mobileWalletProvider || "");
    setMobileNumber(recipient.mobileNumber || "");
    setBankCode("");
    setAccountNumber("");
  }

  setFirstName(recipient.firstName || "");
  setMiddleName(recipient.middleName || "");
  setSurname(recipient.surname || "");
};

// then inside JSX, just before Destination corridor card:

<SavedRecipientsCard
  recipients={savedRecipients}
  onSelectRecipient={handleSelectSavedRecipient}
/>
