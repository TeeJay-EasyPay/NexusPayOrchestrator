import { Feather } from "@expo/vector-icons";
import { Pressable, TextInput, View } from "react-native";
import { UnifiedRecipientRequirements } from "../../services/recipientRequirementsService";
import { colors } from "../../theme";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

export function UnifiedRecipientFields({ requirements, loading, errors, values, onChange, onRetry, onGenerate }: {
  requirements: UnifiedRecipientRequirements;
  loading: boolean;
  errors: string[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onRetry: () => void;
  onGenerate: () => void;
}) {
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Bank recipient requirements</AppText>
        <AppText variant="caption" color={colors.textDarkSecondary}>Combined requirements for currently available payout routes.</AppText>
      </View>
      <DataProvenanceBadge classification="SANDBOX" />
    </View>
    {loading ? <AppText variant="caption" color={colors.textDarkSecondary}>Checking payout-network requirements...</AppText> : null}
    {requirements.observedProviders.length ? <AppText variant="caption" color={colors.textDarkMuted}>{requirements.observedProviders.length} payout network{requirements.observedProviders.length === 1 ? "" : "s"} returned corridor evidence; {requirements.activeProviders.length} currently executable.</AppText> : null}
    <View style={{ gap: 5 }}>
      <Pressable accessibilityRole="button" onPress={onGenerate} disabled={loading || requirements.fields.length === 0} style={({ pressed }) => ({ minHeight: 44, borderWidth: 1, borderColor: colors.gold, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: pressed ? colors.goldSoft : colors.card, opacity: loading ? 0.55 : 1 })}>
        <Feather name="shuffle" size={17} color={colors.gold} />
        <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>Generate sandbox recipient</AppText>
      </Pressable>
      <AppText variant="caption" color={colors.textDarkMuted}>Creates fictitious format-valid data for the available sandbox routes. Providers remain the final validators.</AppText>
    </View>
    {errors.length ? <View style={{ gap: 5 }}>{errors.map((error) => <AppText key={error} variant="caption" color={colors.danger}>{error}</AppText>)}<Pressable onPress={onRetry}><AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>Retry payout networks</AppText></Pressable></View> : null}
    {requirements.fields.map((field) => <View key={field.key} style={{ gap: 6 }}>
      <AppText variant="caption" color={colors.textDarkSecondary}>{field.label}{field.required ? " *" : " (optional)"}</AppText>
      {field.options.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{field.options.map((option) => <Pressable key={option.value} onPress={() => onChange(field.key, option.value)} style={{ borderWidth: 1, borderColor: values[field.key] === option.value ? colors.gold : colors.cardBorder, backgroundColor: values[field.key] === option.value ? colors.goldSoft : colors.cardSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}><AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{option.label}</AppText></Pressable>)}</View> : <TextInput value={values[field.key] ?? ""} onChangeText={(value) => onChange(field.key, value)} autoCapitalize={field.key === "swiftCode" || field.key === "bankAccount" ? "characters" : "sentences"} autoCorrect={false} placeholder={field.placeholder} placeholderTextColor={colors.textDarkMuted} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.textDarkPrimary, backgroundColor: colors.cardSoft }} />}
      {field.hint ? <AppText variant="caption" color={colors.textDarkMuted}>{field.hint}</AppText> : null}
    </View>)}
  </View>;
}
