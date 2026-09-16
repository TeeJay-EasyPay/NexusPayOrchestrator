import { Feather } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Pressable, View } from "react-native";

import { ComplianceStatus, launchIdentityVerification, loadComplianceStatus } from "../../services/sumsubComplianceService";
import { usePersona } from "../../state/PersonaContext";
import { AppText } from "../ui/AppText";
import { ConsumerPill, consumerColors } from "./ConsumerShell";

const labels: Record<string, string> = {
  IDENTITY: "Identity document", SELFIE: "Selfie and liveness",
  APPLICANT_DATA: "Personal details", PROOF_OF_RESIDENCE: "Proof of address",
  PHONE_VERIFICATION: "Phone verification", EMAIL_VERIFICATION: "Email verification",
};
const readable = (value: string) => value.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());

export function IdentityVerification() {
  const { selectedPersona } = usePersona();
  // Remount on persona changes so another persona's results are never displayed.
  return <IdentityVerificationPanel key={`${selectedPersona.id}:${selectedPersona.personaGroup}`} personaId={selectedPersona.id} personaGroup={selectedPersona.personaGroup ?? "PRIVATE_USER"} />;
}

function IdentityVerificationPanel({ personaId, personaGroup }: { personaId: string; personaGroup: string }) {
  const [status, setStatus] = useState<ComplianceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const active = useRef(false);
  const launching = useRef(false);
  const request = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++request.current;
    setLoading(true);
    try {
      const result = await loadComplianceStatus({ personaId, personaGroup, subjectType: "INDIVIDUAL" });
      if (active.current && current === request.current) { setStatus(result); setError(null); }
    } catch (e) {
      if (active.current && current === request.current) {
        setStatus(null);
        setError(e instanceof Error ? e.message : "Unable to load verification status.");
      }
    } finally {
      if (active.current && current === request.current) setLoading(false);
    }
  }, [personaId, personaGroup]);

  useFocusEffect(useCallback(() => {
    active.current = true;
    setBusy(launching.current);
    void refresh();
    const subscription = AppState.addEventListener("change", state => { if (state === "active" && !launching.current) void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === "active" && !launching.current) void refresh(); }, 30000);
    return () => { active.current = false; request.current++; subscription.remove(); clearInterval(timer); };
  }, [refresh]));

  async function start() {
    if (launching.current) return;
    launching.current = true;
    setBusy(true);
    setError(null);
    try {
      await launchIdentityVerification({ personaId, personaGroup, subjectType: "INDIVIDUAL" });
      if (active.current) await refresh();
    } catch (e) {
      if (active.current) setError(e instanceof Error ? e.message : "Unable to open verification.");
    } finally {
      launching.current = false;
      if (active.current) setBusy(false);
    }
  }

  const approved = status?.verificationStatus === "APPROVED";
  return <View style={{ gap: 12 }}>
    <AppText color={consumerColors.text} style={{ fontWeight: "900", fontSize: 18 }}>Identity verification</AppText>
    <AppText color={consumerColors.muted}>Verify your identity with Sumsub. Sandbox results are simulated.</AppText>
    <ConsumerPill label={status ? readable(status.verificationStatus) : loading ? "Loading status…" : "Status unavailable"} tone={approved ? "green" : "gold"} />
    {status?.steps?.map(step => <View key={step.id} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Feather name={step.status === "APPROVED" ? "check-circle" : step.status === "NOT_STARTED" ? "circle" : "clock"} size={20} color={step.status === "APPROVED" ? "#047857" : consumerColors.muted} />
      <View style={{ flex: 1 }}><AppText color={consumerColors.text}>{labels[step.id] ?? readable(step.id)}</AppText><AppText color={consumerColors.muted}>{readable(step.status)}</AppText></View>
    </View>)}
    {status?.stepsAvailable === false ? <AppText color={consumerColors.muted}>Check details are temporarily unavailable. Refresh to retry.</AppText> : null}
    {status && !status.applicantExists ? <AppText color={consumerColors.muted}>Start to see and complete the checks required by your verification level.</AppText> : null}
    {!approved ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void start()} style={{ minHeight: 48, borderRadius: 8, padding: 12, alignItems: "center", justifyContent: "center", backgroundColor: consumerColors.blue, opacity: busy ? 0.6 : 1 }}>
      <AppText color="white" style={{ fontWeight: "900" }}>{busy ? "Opening Sumsub…" : status?.applicantExists ? "Continue verification" : "Start verification"}</AppText>
    </Pressable> : null}
    {error ? <AppText color="#B91C1C">{error}</AppText> : null}
    <Pressable accessibilityRole="button" disabled={loading || busy} onPress={() => void refresh()} style={{ minHeight: 44, justifyContent: "center", alignItems: "center" }}><AppText color={consumerColors.blue}>{loading ? "Refreshing…" : "Refresh verification status"}</AppText></Pressable>
  </View>;
}
