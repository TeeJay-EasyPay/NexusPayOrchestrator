import { Pressable, TextInput, View } from "react-native";
import { NiumBeneficiarySchema, niumFieldHint, niumFieldPlaceholder } from "../../services/niumBeneficiarySchemaService";
import { colors } from "../../theme";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

export function NiumBeneficiaryFields({ schema, loading, error, values, onChange, onRetry }: {
  schema: NiumBeneficiarySchema | null;
  loading: boolean;
  error: string | null;
  values: Record<string, string>;
  onChange: (path: string, value: string) => void;
  onRetry: () => void;
}) {
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>Nium recipient requirements</AppText>
        <AppText variant="caption" color={colors.textDarkSecondary}>
          {schema ? `LOCAL requirements for ${schema.destinationCountry}/${schema.destinationCurrency} returned by Nium` : "Loading provider requirements"}
        </AppText>
      </View>
      <DataProvenanceBadge classification="SANDBOX" />
    </View>
    {loading ? <AppText variant="caption" color={colors.textDarkSecondary}>Checking Nium sandbox requirements...</AppText> : null}
    {schema && !schema.payoutConfigured ? <AppText variant="caption" color={colors.warning}>Nium corridor data is available, but payout execution awaits a configured Nium customer wallet.</AppText> : null}
    {error ? <View style={{ gap: 6 }}><AppText variant="caption" color={colors.danger}>{error}</AppText><Pressable onPress={onRetry}><AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>Retry Nium</AppText></Pressable></View> : null}
    {schema?.fields.filter((field) => field.enabled).map((field) => <View key={field.path} style={{ gap: 6 }}>
      <AppText variant="caption" color={colors.textDarkSecondary}>{field.label}{field.required ? " *" : " (optional)"}</AppText>
      {field.options.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{field.options.map((option) => <Pressable key={option.value} onPress={() => onChange(field.path, option.value)} style={{ borderWidth: 1, borderColor: values[field.path] === option.value ? colors.gold : colors.cardBorder, backgroundColor: values[field.path] === option.value ? colors.goldSoft : colors.cardSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}><AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{option.label}</AppText></Pressable>)}</View> : <TextInput value={values[field.path] ?? ""} onChangeText={(value) => onChange(field.path, value)} autoCapitalize={field.path === "routingCodeValue1" ? "characters" : "sentences"} autoCorrect={false} placeholder={niumFieldPlaceholder(field)} placeholderTextColor={colors.textDarkMuted} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.textDarkPrimary, backgroundColor: colors.cardSoft }} />}
      {niumFieldHint(field) ? <AppText variant="caption" color={colors.textDarkMuted}>{niumFieldHint(field)}</AppText> : null}
    </View>)}
  </View>;
}
