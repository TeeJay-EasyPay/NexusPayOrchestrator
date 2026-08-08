import { useEffect, useState } from "react";
import { View } from "react-native";

import { CorporateShell } from "../src/components/corporate/CorporateShell";
import { ConsumerShell } from "../src/components/consumer/ConsumerShell";
import { DataProvenanceBadge } from "../src/components/operations-v2/DataProvenanceBadge";
import { PlatformShell } from "../src/components/platform/PlatformShell";
import { AppCard } from "../src/components/ui/AppCard";
import { AppText } from "../src/components/ui/AppText";
import { loadCryptoCapabilities, type CryptoCapability } from "../src/services/cryptoFiatOrchestrationService";
import { getXrplTestnetStatus } from "../src/services/xrplTestnetService";
import { isCorporatePersona } from "../src/services/corporateAccessService";
import { usePersona } from "../src/state/PersonaContext";
import { colors } from "../src/theme";

const LABELS: Record<CryptoCapability["journey_type"], string> = {
  FIAT_TO_CRYPTO: "Bank funding to crypto",
  CRYPTO_TO_FIAT: "Crypto funding to bank payout",
  CRYPTO_TO_CRYPTO: "Crypto wallet transfer",
};

export default function CryptoOrchestrationScreen() {
  const { selectedPersona } = usePersona();
  const [capabilities, setCapabilities] = useState<CryptoCapability[]>([]);
  const [error, setError] = useState<string>();
  const [xrplEvidence, setXrplEvidence] = useState("Checking XRPL Testnet evidence...");

  useEffect(() => {
    void loadCryptoCapabilities().then((result) => setCapabilities(result.capabilities)).catch((reason) => setError(reason instanceof Error ? reason.message : String(reason)));
    void getXrplTestnetStatus(1).then((status) => {
      setXrplEvidence(status.pathQuote?.sufficientSourceXrp
        ? `Executable testnet path confirmed at ledger ${status.ledgerIndex}.`
        : `XRPL Testnet connected at ledger ${status.ledgerIndex}; no executable path for 1 RLUSD.`);
    }).catch(() => setXrplEvidence("XRPL Testnet evidence is unavailable."));
  }, []);

  const content = <>
      {error ? <AppCard><AppText color="#B42318">{error}</AppText></AppCard> : null}
      {capabilities.map((capability) => (
        <AppCard key={capability.id}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900", flex: 1 }}>
              {LABELS[capability.journey_type]}
            </AppText>
            <DataProvenanceBadge classification={capability.provenance} />
          </View>
          <AppText color={colors.textDarkSecondary}>{capability.provider_code === "REGULATED_PROVIDER_REQUIRED" ? "Regulated provider not configured" : capability.provider_code}</AppText>
          <AppText variant="caption" color={colors.textDarkSecondary}>Status: {capability.status}</AppText>
          <AppText variant="caption" color={colors.textDarkSecondary}>Assets: {capability.source_assets.join(", ")} to {capability.destination_assets.join(", ")}</AppText>
          <AppText variant="caption" color={colors.textDarkSecondary}>Custody: {capability.custody_model.replaceAll("_", " ")}</AppText>
          {capability.provider_code === "XRPL" ? <AppText variant="caption" color={colors.textDarkSecondary}>{xrplEvidence}</AppText> : null}
        </AppCard>
      ))}
      <AppCard>
        <DataProvenanceBadge classification="UNAVAILABLE" />
        <AppText variant="subheading" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Regulated conversion boundary</AppText>
        <AppText color={colors.textDarkSecondary}>Fiat-to-crypto and crypto-to-fiat submission remain disabled until a regulated provider supplies verified quotes, deposit instructions, compliance decisions and status evidence.</AppText>
      </AppCard>
  </>;

  if (isCorporatePersona(selectedPersona)) {
    return <CorporateShell routeKey="crypto_orchestration" title="Crypto & Fiat Orchestration" subtitle="Provider-evidenced conversion and value movement. No quote or completion is simulated.">{content}</CorporateShell>;
  }

  if (selectedPersona.personaGroup === "PLATFORM_ADMINISTRATION") {
    return <PlatformShell routeKey="crypto_orchestration" title="Crypto & Fiat Orchestration" subtitle="Provider capability and evidence boundary.">{content}</PlatformShell>;
  }

  return <ConsumerShell eyebrow="VALUE OPTIONS" title="Crypto & Fiat Orchestration" subtitle="Provider-evidenced conversion and wallet movement.">{content}</ConsumerShell>;
}
