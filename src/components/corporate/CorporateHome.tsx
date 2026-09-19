import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppMenu } from "../navigation/AppMenu";

import { Transfer } from "../../types/transfer";
import { AppDropdownMenu } from "../navigation/AppDropdownMenu";
import { AppText } from "../ui/AppText";

const ink = "#102332", muted = "#647486", teal = "#087F83";
type Icon = keyof typeof Feather.glyphMap;
export function CorporateHome({ greeting, active, completed, loading, fundingCount, fundingReady, onResend, onDetails, aiControl }: {
  aiControl?: React.ReactNode;
  greeting: string; active: Transfer | null; completed: Transfer[]; loading: boolean;
  fundingCount: number; fundingReady: boolean; onResend: (transfer: Transfer) => void; onDetails: () => void;
}) {
  const router = useRouter();
  const [showAll, setShowAll] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const recentY = useRef(0);
  const failed = active?.status === "FAILED";
  const draft = active && ["CREATED", "ROUTES_FETCHED", "ROUTE_SELECTED", "FUNDING_SELECTED", "FUNDING_AUTHORISED"].includes(active.status);
  const attention = [
    ...(!fundingReady ? [{ title: "Funding source", detail: "Review your payment funding setup", icon: "credit-card" as Icon, route: "/payment-methods" }] : []),
    ...(failed ? [{ title: "Payment needs attention", detail: "Review the latest transfer status", icon: "alert-circle" as Icon, route: "/track" }] : draft ? [{ title: "Continue your payment", detail: "Your transfer is ready to resume", icon: "clock" as Icon, route: "/track" }] : []),
  ];
  const payments = [...(active ? [active] : []), ...completed.filter(item => item.id !== active?.id)];
  const viewPayments = () => { setShowAll(true); scroll.current?.scrollTo({ y: recentY.current, animated: true }); };

  return <SafeAreaView style={s.safe} edges={["top", "left", "right"]}>
    <StatusBar barStyle="light-content" backgroundColor="#102332" />
    <View style={s.header}><AppDropdownMenu branded /></View>
    <ScrollView nestedScrollEnabled ref={scroll} style={s.page} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
      {aiControl}
      <View style={{ gap: 5 }}><AppText color={ink} style={s.greeting}>{greeting.replace(/Morning|Afternoon|Evening/g, word => word.toLowerCase())}.</AppText><AppText color={muted} style={{ fontSize: 17 }}>Your payments, at a glance.</AppText></View>
      <View style={s.actions}><Action title="Send payment" icon="arrow-right" primary onPress={() => router.push("/send")} /><Action title="View payments" icon="file-text" onPress={viewPayments} /></View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/payment-methods")} style={[s.card, s.row]}><IconBox icon="credit-card" /><View style={{ flex: 1, gap: 3 }}><AppText color={ink} style={s.label}>Funding sources</AppText><AppText color={muted}>{fundingCount} saved</AppText></View><Feather name="chevron-right" size={20} color={muted} /></Pressable>
      <View style={s.sectionTitle}><AppText color={ink} style={s.section}>Needs attention</AppText>{attention.length ? <View style={s.count}><AppText color="#875409" style={{ fontWeight: "800" }}>{attention.length}</AppText></View> : null}</View>
      <View style={s.card}>{attention.length ? attention.map((item, index) => <Pressable key={item.title} accessibilityRole="button" onPress={() => router.push(item.route as never)} style={[s.row, index > 0 && s.divider]}><IconBox icon={item.icon} amber /><View style={{ flex: 1, gap: 4 }}><AppText color={ink} style={s.label}>{item.title}</AppText><AppText color={muted} style={s.small}>{item.detail}</AppText></View><Feather name="chevron-right" size={20} color={muted} /></Pressable>) : <View style={s.row}><IconBox icon="check" /><View style={{ flex: 1, gap: 4 }}><AppText color={ink} style={s.label}>No payment tasks to show</AppText><AppText color={muted} style={s.small}>Review compliance separately for verification requirements.</AppText></View></View>}</View>
      <Pressable accessibilityRole="button" onPress={() => router.push("/compliance" as never)} style={s.compliance}><Feather name="shield" size={18} color={teal} /><AppText color={teal} style={{ flex: 1, fontSize: 14, fontWeight: "700" }}>Company verification & compliance</AppText><Feather name="chevron-right" size={18} color={teal} /></Pressable>
      <View style={[s.card, { flexDirection: "row" }]}><View style={s.metric}><AppText color={muted} style={s.small}>Open transfers</AppText><AppText color={ink} style={s.number}>{active && !failed ? 1 : 0}</AppText></View><View style={[s.metric, { borderLeftWidth: 1, borderLeftColor: "#E1E5E8" }]}><AppText color={muted} style={s.small}>Recorded completed</AppText><AppText color={ink} style={s.number}>{loading ? "—" : completed.length}</AppText></View></View>
      <View onLayout={event => { recentY.current = event.nativeEvent.layout.y; }} style={s.sectionTitle}><AppText color={ink} style={[s.section, { flex: 1 }]}>Recent payments</AppText><Pressable accessibilityRole="button" onPress={() => setShowAll(value => !value)} style={s.link}><AppText color={teal} style={{ fontWeight: "700" }}>{showAll ? "Show less" : "View all"}</AppText></Pressable></View>
      <View style={s.card}><ScrollView nestedScrollEnabled style={{ maxHeight: showAll ? 520 : 320 }} accessibilityLabel="Recent payments" showsVerticalScrollIndicator>{payments.length ? payments.map((item, index) => {
        const done = item.status === "COMPLETED";
        const name = item.recipient.name || [item.recipient.firstName, item.recipient.surname].filter(Boolean).join(" ") || "Recipient";
        const initials = name.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
        const status = done ? "Completed" : item.status.replace(/_/g, " ").toLowerCase();
        return <View key={item.id} style={[s.payment, index > 0 && s.divider]}><View style={s.row}><View style={s.initials}><AppText color={ink} style={{ fontWeight: "800" }}>{initials}</AppText></View><View style={{ flex: 1, gap: 4 }}><AppText color={ink} style={s.label}>{name}</AppText><AppText color={muted} style={s.small}>{new Date(item.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })} · {item.recipient.payoutMethod === "BANK" ? "Bank transfer" : "Mobile wallet"}</AppText></View></View><View style={s.paymentDetails}><AppText color={ink} style={s.label}>{new Intl.NumberFormat(undefined, { style: "currency", currency: item.senderCurrency }).format(item.senderAmount)}</AppText><View style={[s.status, { backgroundColor: done ? "#DDF6EB" : "#EDF2F8" }]}><AppText color={done ? "#086D56" : muted} style={{ fontSize: 12, textTransform: "capitalize" }}>{status}</AppText></View><Pressable accessibilityRole="button" accessibilityLabel={done ? `Resend payment to ${name}` : `Track payment to ${name}`} onPress={() => done ? onResend(item) : router.push("/track")} style={s.link}><AppText color={teal} style={{ fontWeight: "700", fontSize: 12 }}>{done ? "Resend" : "Track"}</AppText></Pressable></View></View>;
      }) : <View style={{ padding: 20, gap: 6 }}><AppText color={ink} style={s.label}>{loading ? "Loading payments…" : "No recent payments"}</AppText><AppText color={muted} style={s.small}>Your transfer activity will appear here.</AppText></View>}</ScrollView></View>
      <Pressable accessibilityRole="button" onPress={onDetails} style={s.compliance}><Feather name="grid" size={17} color={muted} /><AppText color={muted} style={{ flex: 1, fontSize: 13 }}>Open detailed dashboard</AppText><Feather name="chevron-right" size={18} color={muted} /></Pressable>
    </ScrollView>
    <SafeAreaView edges={["bottom"]} style={s.bottom}><AppMenu /></SafeAreaView>
  </SafeAreaView>;
}
function IconBox({ icon, amber = false }: { icon: Icon; amber?: boolean }) { return <View style={[s.icon, amber && { backgroundColor: "#FFF0D5" }]}><Feather name={icon} size={22} color={amber ? "#A6640B" : ink} /></View>; }
function Action({ title, icon, primary, onPress }: { title: string; icon: Icon; primary?: boolean; onPress: () => void }) { return <Pressable accessibilityRole="button" onPress={onPress} style={[s.action, primary && { backgroundColor: teal }]}><Feather name={icon} size={20} color={primary ? "white" : teal} /><AppText color={primary ? "white" : ink} style={{ fontSize: 14, fontWeight: "800", flexShrink: 1 }}>{title}</AppText></Pressable>; }
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: ink }, header: { paddingHorizontal: 18, paddingVertical: 13 }, page: { flex: 1, backgroundColor: "#F6F5F1" }, content: { padding: 18, paddingTop: 24, paddingBottom: 20, gap: 16, maxWidth: 760, width: "100%", alignSelf: "center" },
  greeting: { fontSize: 30, fontWeight: "800", letterSpacing: -0.7 }, actions: { flexDirection: "row", gap: 10, marginVertical: 2 }, action: { flex: 1, minHeight: 54, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: teal, backgroundColor: "white", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9 },
  card: { backgroundColor: "white", borderWidth: 1, borderColor: "#E4E7EB", borderRadius: 16, overflow: "hidden" }, row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15 }, icon: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#EDF1F4", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 15, fontWeight: "700" }, small: { fontSize: 12, lineHeight: 18 }, sectionTitle: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 6 }, section: { fontSize: 21, fontWeight: "800" }, count: { backgroundColor: "#FFE4B0", borderRadius: 14, paddingHorizontal: 9, paddingVertical: 3 }, divider: { borderTopWidth: 1, borderTopColor: "#E8EBED" },
  compliance: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44, paddingHorizontal: 4 }, metric: { flex: 1, marginVertical: 15, paddingHorizontal: 15, gap: 5 }, number: { fontSize: 29, fontWeight: "800" }, initials: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#E0F0EE", alignItems: "center", justifyContent: "center" },
  payment: { paddingBottom: 8 }, paymentDetails: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10, paddingHorizontal: 15 }, status: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }, link: { minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }, bottom: { backgroundColor: "white" }, tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "#E4E7EB", paddingVertical: 9, paddingHorizontal: 8 }, tab: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 5 },
});
