import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { complianceAreas, complianceRoute } from "../../services/complianceNavigation";
import { AppText } from "../ui/AppText";

export function ComplianceShortcuts() {
  const router = useRouter();
  return <View style={{ gap: 14 }}>
    <AppText color="#142C40" style={{ fontSize: 20, fontWeight: "800" }}>Verification & compliance</AppText>
    <AppText color="#637789">Manage company verification, representative identity and screening.</AppText>
    {complianceAreas.map(area => <Pressable key={area.id} accessibilityRole="button" onPress={() => router.push(complianceRoute(area.id) as never)} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 70, padding: 12, borderRadius: 12, backgroundColor: "#F3F8FA", borderWidth: 1, borderColor: "#E1EBEF" }}>
      <Feather name={area.icon} size={21} color="#087C89" />
      <View style={{ flex: 1, gap: 4 }}><AppText color="#142C40" style={{ fontWeight: "800" }}>{area.label}</AppText><AppText color="#637789" style={{ fontSize: 12 }}>{area.description}</AppText></View>
      <Feather name="chevron-right" size={18} color="#637789" />
    </Pressable>)}
  </View>;
}
