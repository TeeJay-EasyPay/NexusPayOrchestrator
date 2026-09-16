import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, View } from "react-native";

import { ConsumerShell } from "../src/components/consumer/ConsumerShell";
import { IdentityVerification } from "../src/components/consumer/IdentityVerification";
import { CorporateShell } from "../src/components/corporate/CorporateShell";
import { PlatformShell } from "../src/components/platform/PlatformShell";
import { AppText } from "../src/components/ui/AppText";
import { complianceAreas, ComplianceArea } from "../src/services/complianceNavigation";
import { isCorporatePersona } from "../src/services/corporateAccessService";
import { ComplianceStatus, loadComplianceHealth, loadComplianceStatus, loadTransactionChecks } from "../src/services/sumsubComplianceService";
import { usePersona } from "../src/state/PersonaContext";

const text = "#142C40", muted = "#637789", teal = "#087C89";
const names: Record<string, string> = { NOT_CONFIGURED: "Activation required", NOT_STARTED: "Not started", NOT_SCREENED: "Not screened", NOT_SUBMITTED: "No checks yet", APPROVED: "Approved", CLEAR: "Clear", CONNECTED: "Connected", READY: "Ready", PENDING_REVIEW: "Pending review", UNAVAILABLE: "Unavailable", LOADING: "Checking…", UNCONFIRMED: "Not confirmed" };
const readable = (s: string) => names[s] ?? s.toLowerCase().replace(/_/g, " ").replace(/^./, c => c.toUpperCase());
function Badge({ status }: { status: string }) {
  const good = ["APPROVED", "CLEAR", "CONNECTED", "READY", "CONFIGURED"].includes(status);
  const bad = ["REJECTED", "HIGH_RISK", "ERROR", "UNAVAILABLE"].includes(status);
  return <View style={[styles.badge, { backgroundColor: good ? "#E3F4EB" : bad ? "#FDEBEC" : "#EDF3F7" }]}><AppText style={{ fontSize: 12, fontWeight: "800" }} color={good ? "#16704B" : bad ? "#AA343F" : muted}>{readable(status)}</AppText></View>;
}
function Row({ label, status, detail }: { label: string; status: string; detail?: string }) {
  return <View style={styles.row}><View style={{ gap: 7, flex: 1 }}><AppText color={text} style={{ fontWeight: "700" }}>{label}</AppText>{detail ? <AppText color={muted} style={{ fontSize: 13, lineHeight: 20 }}>{detail}</AppText> : null}</View><Badge status={status} /></View>;
}
function Notice({ title, children }: { title: string; children: string }) {
  return <View style={styles.notice}><Feather name="info" size={18} color={teal} /><View style={{ flex: 1, gap: 5 }}><AppText color={text} style={{ fontWeight: "800" }}>{title}</AppText><AppText color={muted} style={{ fontSize: 14, lineHeight: 21 }}>{children}</AppText></View></View>;
}

type Checks = Awaited<ReturnType<typeof loadTransactionChecks>>["checks"];
function ComplianceContent({ platform, organisation, initial }: { platform: boolean; organisation: boolean; initial: ComplianceArea }) {
  const { selectedPersona } = usePersona();
  const [selected, setSelected] = useState(initial);
  const router = useRouter();
  const [individual, setIndividual] = useState<ComplianceStatus | null>(null);
  const [company, setCompany] = useState<ComplianceStatus | null>(null);
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [checks, setChecks] = useState<Checks | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updated, setUpdated] = useState<string | null>(null);
  const alive = useRef(false), generation = useRef(0);
  const refresh = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    const input = { personaId: selectedPersona.id, personaGroup: selectedPersona.personaGroup ?? "PRIVATE_USER", subjectType: "INDIVIDUAL" as const };
    const results = await Promise.allSettled([
      loadComplianceHealth({ ...input, subjectType: platform ? "PLATFORM" : "INDIVIDUAL" }),
      platform ? Promise.resolve(null) : loadComplianceStatus(input),
      !platform && organisation ? loadComplianceStatus({ ...input, subjectType: "COMPANY" }) : Promise.resolve(null),
      platform ? Promise.resolve(null) : loadTransactionChecks(input),
    ]);
    if (!alive.current || id !== generation.current) return;
    const [h, i, c, t] = results;
    setHealth(h.status === "fulfilled" ? h.value : null);
    setIndividual(i.status === "fulfilled" ? i.value : null);
    setCompany(c.status === "fulfilled" ? c.value : null);
    setChecks(t.status === "fulfilled" ? t.value?.checks ?? null : null);
    setErrors(results.flatMap((r, index) => r.status === "rejected" ? [`${["Service readiness", "Identity status", "Company status", "Transaction history"][index]} could not be loaded. Refresh to retry.`] : []));
    setUpdated(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    setLoading(false);
  }, [selectedPersona.id, selectedPersona.personaGroup, platform, organisation]);
  useFocusEffect(useCallback(() => {
    alive.current = true;
    void refresh();
    const listener = AppState.addEventListener("change", state => { if (state === "active") void refresh(); });
    return () => { alive.current = false; generation.current++; listener.remove(); };
  }, [refresh]));
  const missing = loading ? "LOADING" : "UNAVAILABLE";
  const companyStatus = platform ? health ? health.companyLevelConfigured ? "READY" : "NOT_CONFIGURED" : missing : company?.verificationStatus ?? missing;
  const identityStatus = platform ? health ? health.individualLevelConfigured ? "READY" : "NOT_CONFIGURED" : missing : individual?.verificationStatus ?? missing;
  const monitoringStatus = health ? health.transactionMonitoringEnabled ? "READY" : "NOT_CONFIGURED" : missing;
  // A representative's clearance must never mask an unreviewed company.
  const amlResults = organisation ? [individual?.amlStatus, company?.amlStatus] : [individual?.amlStatus];
  const amlSummary = amlResults.includes("HIGH_RISK") ? "HIGH_RISK"
    : amlResults.includes("REVIEW_REQUIRED") ? "REVIEW_REQUIRED"
    : amlResults.includes("PENDING_REVIEW") ? "PENDING_REVIEW"
    : amlResults.some(result => !result || result === "UNAVAILABLE") ? missing
    : amlResults.every(result => result === "CLEAR") ? "CLEAR" : "NOT_SCREENED";
  const statusByArea = { company: companyStatus, identity: identityStatus, aml: platform ? "UNCONFIRMED" : amlSummary, transactions: monitoringStatus };
  const areas = complianceAreas.filter(area => area.id !== "company" || organisation || platform);
  const current = areas.find(area => area.id === selected) ?? areas[0];
  const companyBlocked = companyStatus === "NOT_CONFIGURED";
  const profiles = Array.isArray(health?.profiles) ? health.profiles as Record<string, unknown>[] : [];

  return <>
    <View style={styles.context}>
      <View style={styles.contextIcon}><Feather name={platform ? "layers" : organisation ? "briefcase" : "shield"} size={23} color={teal} /></View>
      <View style={{ flex: 1, gap: 4 }}><AppText color={muted} style={styles.eyebrow}>{platform ? "COMPLIANCE OPERATIONS" : "VERIFICATION CENTRE"}</AppText><AppText color={text} style={{ fontSize: 19, fontWeight: "800" }}>{selectedPersona.label}</AppText></View>
      <View style={styles.sandbox}><AppText color={teal} style={{ fontSize: 11, fontWeight: "800" }}>SANDBOX</AppText></View>
    </View>
    <View style={styles.grid}>{areas.map(area => <Pressable key={area.id} accessibilityRole="tab" accessibilityState={{ selected: current.id === area.id }} onPress={() => { setSelected(area.id); router.setParams({ section: area.id }); }} style={[styles.tile, current.id === area.id && styles.activeTile]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Feather name={area.icon} size={23} color={teal} /><Feather name={current.id === area.id ? "arrow-down-right" : "arrow-up-right"} size={17} color={muted} /></View>
      <AppText color={text} style={{ fontWeight: "800", fontSize: 17 }}>{area.short}</AppText>
      <AppText color={muted} style={{ fontSize: 12 }}>{area.id === "company" ? "Business verification · KYB" : area.id === "identity" ? organisation ? "Representative · KYC" : "Personal verification · KYC" : area.id === "aml" ? "Sanctions & watchlists" : "Payment risk reviews"}</AppText>
      <Badge status={statusByArea[area.id]} />
    </Pressable>)}</View>
    <View style={styles.card}>
      <View style={styles.heading}><View style={styles.contextIcon}><Feather name={current.icon} size={22} color={teal} /></View><View style={{ flex: 1, gap: 4 }}><AppText color={muted} style={styles.eyebrow}>{platform ? "SERVICE READINESS" : "YOUR NEXT STEP"}</AppText><AppText color={text} style={{ fontSize: 21, fontWeight: "800" }}>{current.label}</AppText></View></View>
      {current.id === "company" ? <>
        <Row label={platform ? "Company workflow" : "Verification status"} status={companyStatus} />
        <AppText color={muted} style={styles.body}>Verify the legal entity, the people who control it, and the documents that support its business activity.</AppText>
        {companyBlocked ? <Notice title="Company verification awaits activation">{platform ? "Company verification is restricted on the current Sumsub sandbox account. Enable KYB with Sumsub and configure the company workflow before onboarding businesses." : "Your organisation’s administrator needs to activate company verification with the provider. You can complete representative identity verification while this is being arranged."}</Notice> : null}
        {[["Company details", "Legal name, registration and registered address"], ["Ownership & control", "Directors and ultimate beneficial owners"], ["Business documents", "Evidence requested by the company workflow"]].map(([label, detail], index) => <View key={label} style={styles.row}><View style={styles.number}><AppText color={teal} style={{ fontWeight: "800" }}>0{index + 1}</AppText></View><View style={{ flex: 1, gap: 4 }}><AppText color={text} style={{ fontWeight: "700" }}>{label}</AppText><AppText color={muted} style={{ fontSize: 13 }}>{detail}</AppText></View></View>)}
        <AppText color={muted} style={{ fontSize: 12 }}>These are requirement areas, not completed checks. Exact checks depend on the enabled company workflow.</AppText>
        {!companyBlocked && !platform ? <Notice title="Company onboarding">The guided company submission flow is not available in this app yet. Your administrator will provide the approved company onboarding route.</Notice> : null}
        {!platform ? <Pressable accessibilityRole="button" onPress={() => { setSelected("identity"); router.setParams({ section: "identity" }); }} style={styles.button}><AppText color="white" style={{ fontWeight: "800" }}>Verify a representative</AppText><Feather name="arrow-right" color="white" size={18} /></Pressable> : null}
      </> : null}
      {current.id === "identity" ? platform ? <><Row label="Individual workflow" status={identityStatus} /><Notice title="Representative verification">Business and corporate users can start their identity document and selfie checks from their own workspace. Results are scoped to the signed-in account and active persona.</Notice></> : <><AppText color={muted} style={styles.body}>{organisation ? "Verify the authorised person acting for this organisation. This is separate from verification of the company itself." : "Complete the checks requested for your personal account."}</AppText><IdentityVerification /></> : null}
      {current.id === "aml" ? <>
        <AppText color={muted} style={styles.body}>Review sanctions, politically exposed person and watchlist screening outcomes returned by the provider.</AppText>
        {platform ? <Notice title="Screening entitlement requires confirmation">A working identity connection does not confirm AML screening is enabled. Confirm the provider entitlement and workflow settings, then validate a screening result.</Notice> : <><Row label={organisation ? "Representative screening" : "Personal screening"} status={individual?.amlStatus ?? missing} />{organisation ? <Row label="Company screening" status={company?.amlStatus ?? missing} /> : null}<Notice title="Results appear after screening">No screening result means no clearance has been established. Identity approval and AML clearance are separate outcomes.</Notice></>}
      </> : null}
      {current.id === "transactions" ? <>
        <Row label="Monitoring service" status={monitoringStatus} />
        {monitoringStatus === "NOT_CONFIGURED" ? <Notice title="Monitoring awaits activation">{platform ? "Enable and validate transaction monitoring with the provider before accepting payment screening submissions." : "Transaction monitoring has not been activated for this sandbox. Your administrator must enable it before payment screening can begin."}</Notice> : null}
        {!platform ? <><AppText color={text} style={{ fontWeight: "800", marginTop: 8 }}>Recent checks</AppText>{checks?.length ? checks.map(check => <Row key={check.transfer_id} label={check.transfer_id} status={check.status} detail={new Date(check.updated_at).toLocaleString()} />) : <View style={styles.empty}><Feather name="inbox" size={28} color={muted} /><AppText color={text} style={{ fontWeight: "700" }}>{checks ? "No transaction checks yet" : loading ? "Loading checks…" : "History unavailable"}</AppText><AppText color={muted} style={{ textAlign: "center" }}>Submitted payment checks will appear here with their review status.</AppText></View>}</> : null}
        <AppText color={muted} style={{ fontSize: 13 }}>A screening result does not submit a payment or authorise its execution.</AppText>
      </> : null}
    </View>
    {platform ? <View style={styles.card}><AppText color={text} style={{ fontSize: 19, fontWeight: "800" }}>Provider connection</AppText><Row label="Sumsub API" status={health ? health.connected ? "CONNECTED" : "UNAVAILABLE" : missing} /><Row label="Webhook receiver" status={health ? health.webhookSecretConfigured ? "CONFIGURED" : "NOT_CONFIGURED" : missing} /><Row label="Provider event delivery" status={health?.webhookDeliveryConfigured === true ? "CONFIGURED" : health?.webhookDeliveryConfigured === false ? "NOT_CONFIGURED" : missing} /><AppText color={muted} style={styles.body}>{health ? `${profiles.length} verification records visible to your signed-in account.` : "Account verification records are not available yet."} This view does not grant access to other accounts’ cases.</AppText></View> : null}
    {errors.map(error => <Notice key={error} title="Some information is unavailable">{error}</Notice>)}
    <View style={{ alignItems: "center", gap: 4 }}><Pressable accessibilityRole="button" disabled={loading} onPress={() => void refresh()} style={styles.refresh}><Feather name="refresh-cw" size={16} color={teal} /><AppText color={teal} style={{ fontWeight: "800" }}>{loading ? "Refreshing status…" : "Refresh compliance status"}</AppText></Pressable><AppText color={muted} style={{ fontSize: 12 }}>{updated ? `Last checked ${updated}${errors.length ? " · Some services unavailable" : ""}` : "Connecting to verification services"} · Sandbox results are simulated</AppText></View>
  </>;
}

export default function ComplianceScreen() {
  const { selectedPersona } = usePersona();
  const { section } = useLocalSearchParams<{ section?: string }>();
  const platform = selectedPersona.personaGroup === "PLATFORM_ADMINISTRATION";
  const corporate = isCorporatePersona(selectedPersona);
  const organisation = corporate || selectedPersona.personaGroup === "BUSINESS_ENTITY";
  const initial = complianceAreas.find(area => area.id === section && (area.id !== "company" || organisation || platform))?.id ?? (organisation || platform ? "company" : "identity");
  const content = <ComplianceContent key={`${selectedPersona.id}:${selectedPersona.personaGroup}:${initial}`} platform={platform} organisation={organisation} initial={initial} />;
  const title = platform ? "Compliance operations" : organisation ? "Business verification" : "Verification & security";
  const subtitle = platform ? "Oversee verification services, provider readiness and screening controls." : organisation ? "Company verification, representative identity and financial crime checks in one place." : "Manage identity verification and screening for your personal account.";
  if (platform) return <PlatformShell routeKey="compliance" title={title} subtitle={subtitle}>{content}</PlatformShell>;
  if (corporate) return <CorporateShell routeKey="compliance" title={title} subtitle={subtitle}>{content}</CorporateShell>;
  return <ConsumerShell eyebrow="TRUST & COMPLIANCE" title={title} subtitle={subtitle}>{content}</ConsumerShell>;
}
const styles = StyleSheet.create({
  context: { backgroundColor: "#FFFFFF", borderRadius: 16, borderWidth: 1, borderColor: "#DFE9EE", padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  contextIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: "#E4F3F2", alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 10, fontWeight: "800", letterSpacing: 1.3 },
  sandbox: { padding: 7, backgroundColor: "#E4F3F2", borderRadius: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { flexGrow: 1, flexBasis: "46%", minWidth: 140, borderRadius: 16, padding: 16, gap: 10, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DFE9EE" },
  activeTile: { borderColor: teal, backgroundColor: "#F0FAF9", borderWidth: 2, padding: 15 },
  badge: { borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5, alignSelf: "flex-start", flexShrink: 1 },
  card: { borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#DFE9EE", padding: 18, gap: 17 },
  heading: { flexDirection: "row", alignItems: "center", gap: 12 },
  body: { fontSize: 14, lineHeight: 22 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EDF2F5" },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, backgroundColor: "#F0F6F8", borderRadius: 12 },
  number: { width: 32, height: 32, borderRadius: 9, backgroundColor: "#E4F3F2", alignItems: "center", justifyContent: "center" },
  button: { minHeight: 48, borderRadius: 10, backgroundColor: teal, flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 14, gap: 10 },
  empty: { padding: 22, alignItems: "center", gap: 10, backgroundColor: "#F7FAFC", borderRadius: 12 },
  refresh: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
});
