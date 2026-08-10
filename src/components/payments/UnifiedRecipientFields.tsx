import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";
import { UnifiedRecipientField, UnifiedRecipientRequirements } from "../../services/recipientRequirementsService";
import { colors } from "../../theme";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

function UnifiedOptionSelect({ field, value, onChange }: {
  field: UnifiedRecipientField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const options = useMemo(() => [...field.options].sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { sensitivity: "base" })), [field.options]);
  const selected = options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((option) => `${option.label} ${option.value}`.toLowerCase().includes(normalized));
  }, [options, query]);

  return <>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${field.label}`}
      onPress={() => setOpen(true)}
      style={{ minHeight: 50, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, backgroundColor: colors.cardSoft, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}
    >
      <AppText variant="body" color={selected ? colors.textDarkPrimary : colors.textDarkMuted} style={{ flex: 1 }}>
        {selected?.label ?? `Select ${field.label.toLowerCase()}`}
      </AppText>
      <Feather name="chevron-down" size={20} color={colors.textDarkSecondary} />
    </Pressable>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <Pressable onPress={() => setOpen(false)} style={{ flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(4, 17, 32, 0.72)" }}>
        <Pressable onPress={(event) => event.stopPropagation()} style={{ maxHeight: "76%", borderRadius: 8, padding: 18, gap: 12, backgroundColor: colors.card }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <AppText variant="subheading" color={colors.textDarkPrimary} style={{ flex: 1 }}>Select {field.label}</AppText>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close selection">
              <AppText variant="body" color={colors.gold} style={{ fontWeight: "900" }}>Close</AppText>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${field.label.toLowerCase()}`}
            placeholderTextColor={colors.textDarkMuted}
            autoCorrect={false}
            style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.textDarkPrimary, backgroundColor: colors.cardSoft }}
          />
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
            {filteredOptions.map((option) => {
              const active = option.value === value;
              return <Pressable key={option.value} onPress={() => { onChange(option.value); setQuery(""); setOpen(false); }} style={{ borderRadius: 8, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: active ? colors.goldSoft : colors.cardSoft, borderWidth: 1, borderColor: active ? colors.gold : colors.cardBorder }}>
                <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: active ? "900" : "600" }}>{option.label}</AppText>
              </Pressable>;
            })}
            {filteredOptions.length === 0 ? <AppText variant="caption" color={colors.textDarkSecondary}>No matching option was returned by the payout networks.</AppText> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  </>;
}

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
      {field.options.length > 8 ? <UnifiedOptionSelect field={field} value={values[field.key] ?? ""} onChange={(value) => onChange(field.key, value)} /> : field.options.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>{field.options.map((option) => <Pressable key={option.value} onPress={() => onChange(field.key, option.value)} style={{ borderWidth: 1, borderColor: values[field.key] === option.value ? colors.gold : colors.cardBorder, backgroundColor: values[field.key] === option.value ? colors.goldSoft : colors.cardSoft, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10 }}><AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>{option.label}</AppText></Pressable>)}</View> : <TextInput value={values[field.key] ?? ""} onChangeText={(value) => onChange(field.key, value)} autoCapitalize={field.key === "swiftCode" || field.key === "bankAccount" ? "characters" : "sentences"} autoCorrect={false} placeholder={field.placeholder} placeholderTextColor={colors.textDarkMuted} style={{ borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: colors.textDarkPrimary, backgroundColor: colors.cardSoft }} />}
      {field.hint ? <AppText variant="caption" color={colors.textDarkMuted}>{field.hint}</AppText> : null}
    </View>)}
  </View>;
}
