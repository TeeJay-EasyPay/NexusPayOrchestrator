// only showing relevant additions

import { toggleRecipientFavorite } from "../src/services/recipientService";
import { writeAuditLog } from "../src/services/auditLog";

// inside component state
const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

const handleSelectSavedRecipient = (recipient: SavedRecipient) => {
  setSelectedRecipientId(recipient.id);

  writeAuditLog({
    eventType: "RECIPIENT_REUSED",
    entityType: "recipient",
    entityId: recipient.id,
    metadata: { source: "saved_recipients_card" },
  });

  // existing logic continues...
};

const handleToggleFavorite = async (recipient: SavedRecipient) => {
  await toggleRecipientFavorite(recipient);
  refreshSavedRecipients();
};

// update JSX
<SavedRecipientsCard
  recipients={savedRecipients}
  selectedRecipientId={selectedRecipientId}
  onSelectRecipient={handleSelectSavedRecipient}
  onToggleFavorite={handleToggleFavorite}
/>
