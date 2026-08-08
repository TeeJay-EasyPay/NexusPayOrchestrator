import { Feather } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, TextInput, View } from "react-native";

import {
  AirwallexBeneficiaryField,
  AirwallexBeneficiarySchema,
  airwallexFieldFormatHint,
  airwallexFieldPlaceholder,
  fieldValue,
} from "../../services/airwallexBeneficiarySchemaService";
import { colors } from "../../theme";
import { DataProvenanceBadge } from "../operations-v2/DataProvenanceBadge";
import { AppText } from "../ui/AppText";

const FIXED_PATHS = new Set([
  "beneficiary.type",
  "beneficiary.entity_type",
  "beneficiary.first_name",
  "beneficiary.last_name",
  "beneficiary.bank_details.account_name",
  "beneficiary.bank_details.account_currency",
  "beneficiary.bank_details.bank_country_code",
  "beneficiary.bank_details.bank_name",
  "beneficiary.address.country_code",
]);

function keyboardForField(field: AirwallexBeneficiaryField) {
  const key = field.path.toLowerCase();
  if (key.includes("phone") || key.includes("mobile")) return "phone-pad" as const;
  if (key.includes("account_number") || key.includes("routing_value")) return "default" as const;
  return "default" as const;
}

function fieldLabel(field: AirwallexBeneficiaryField) {
  return `${field.label}${field.required ? " *" : " (optional)"}`;
}

function AirwallexOptionSelect({
  field,
  value,
  onChange,
}: {
  field: AirwallexBeneficiaryField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = field.options.find((option) => option.value === value);
  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return field.options;
    return field.options.filter((option) =>
      `${option.label} ${option.value}`.toLowerCase().includes(normalized),
    );
  }, [field.options, query]);

  return (
    <View style={{ gap: 6 }}>
      <AppText variant="caption" color={colors.textDarkSecondary}>{fieldLabel(field)}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Select ${field.label}`}
        onPress={() => setOpen(true)}
        style={{
          minHeight: 50,
          borderWidth: 1,
          borderColor: colors.cardBorder,
          borderRadius: 8,
          paddingHorizontal: 14,
          paddingVertical: 13,
          backgroundColor: colors.cardSoft,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <AppText variant="body" color={selected ? colors.textDarkPrimary : colors.textDarkMuted} style={{ flex: 1 }}>
          {selected?.label ?? `Select ${field.label.toLowerCase()}`}
        </AppText>
        <Feather name="chevron-down" size={20} color={colors.textDarkSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable
          onPress={() => setOpen(false)}
          style={{ flex: 1, justifyContent: "center", padding: 22, backgroundColor: "rgba(4, 17, 32, 0.72)" }}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={{ maxHeight: "76%", borderRadius: 8, padding: 18, gap: 12, backgroundColor: colors.card }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <AppText variant="subheading" color={colors.textDarkPrimary} style={{ flex: 1 }}>
                Select {field.label}
              </AppText>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Close selection">
                <AppText variant="body" color={colors.gold} style={{ fontWeight: "900" }}>Close</AppText>
              </Pressable>
            </View>
            {field.options.length > 8 ? (
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`Search ${field.label.toLowerCase()}`}
                placeholderTextColor={colors.textDarkMuted}
                autoCorrect={false}
                style={{
                  borderWidth: 1,
                  borderColor: colors.cardBorder,
                  borderRadius: 8,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 16,
                  color: colors.textDarkPrimary,
                  backgroundColor: colors.cardSoft,
                }}
              />
            ) : null}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 6 }}>
              {filteredOptions.map((option) => {
                const active = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => {
                      onChange(option.value);
                      setQuery("");
                      setOpen(false);
                    }}
                    style={{
                      borderRadius: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: active ? colors.goldSoft : colors.cardSoft,
                      borderWidth: 1,
                      borderColor: active ? colors.gold : colors.cardBorder,
                    }}
                  >
                    <AppText variant="body" color={colors.textDarkPrimary} style={{ fontWeight: active ? "900" : "600" }}>
                      {option.label}
                    </AppText>
                  </Pressable>
                );
              })}
              {filteredOptions.length === 0 ? (
                <AppText variant="caption" color={colors.textDarkSecondary}>No matching option returned by Airwallex.</AppText>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export function AirwallexBeneficiaryFields({
  schema,
  loading,
  error,
  values,
  fixedValues,
  onChange,
  onRetry,
  onGenerateSandboxRecipient,
}: {
  schema: AirwallexBeneficiarySchema | null;
  loading: boolean;
  error: string | null;
  values: Record<string, string>;
  fixedValues: Record<string, string>;
  onChange: (path: string, value: string) => void;
  onRetry: () => void;
  onGenerateSandboxRecipient?: () => void;
}) {
  const visibleFields = schema?.fields.filter((field) => field.enabled && !FIXED_PATHS.has(field.path)) ?? [];

  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "900" }}>
            Airwallex recipient requirements
          </AppText>
          <AppText variant="caption" color={colors.textDarkSecondary}>
            {schema
              ? `${schema.transferMethod} requirements for ${schema.bankCountryCode}/${schema.accountCurrency} returned by Airwallex`
              : "Loading provider requirements"}
          </AppText>
        </View>
        <DataProvenanceBadge classification="SANDBOX" />
      </View>

      {loading ? <AppText variant="caption" color={colors.textDarkSecondary}>Checking Airwallex sandbox requirements...</AppText> : null}

      {schema?.provenance === "SANDBOX" && onGenerateSandboxRecipient ? (
        <View style={{ gap: 5 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate sandbox test recipient"
            onPress={onGenerateSandboxRecipient}
            style={({ pressed }) => ({
              minHeight: 44,
              borderWidth: 1,
              borderColor: colors.gold,
              borderRadius: 8,
              paddingHorizontal: 14,
              paddingVertical: 10,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              backgroundColor: pressed ? colors.goldSoft : colors.card,
            })}
          >
            <Feather name="shuffle" size={17} color={colors.gold} />
            <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>
              Generate sandbox recipient
            </AppText>
          </Pressable>
          <AppText variant="caption" color={colors.textDarkMuted}>
            Creates fictitious, format-valid test data. Airwallex remains the final sandbox validator.
          </AppText>
        </View>
      ) : null}

      {error ? (
        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.danger}>{error}</AppText>
          <Pressable onPress={onRetry} style={{ alignSelf: "flex-start", paddingVertical: 8, paddingHorizontal: 12 }}>
            <AppText variant="caption" color={colors.gold} style={{ fontWeight: "900" }}>Retry Airwallex</AppText>
          </Pressable>
        </View>
      ) : null}

      {visibleFields.map((field) => {
        const value = fieldValue(field, values, fixedValues);
        const options = field.options ?? [];
        if (options.length > 0) {
          return <AirwallexOptionSelect key={field.path} field={field} value={value} onChange={(next) => onChange(field.path, next)} />;
        }

        const formatHint = airwallexFieldFormatHint(field);
        const supportingText = [field.description, formatHint]
          .filter((item, index, items): item is string => Boolean(item) && items.indexOf(item) === index);

        return (
          <View key={field.path} style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              {fieldLabel(field)}
            </AppText>
            <TextInput
              value={value}
              onChangeText={(nextValue) => onChange(field.path, nextValue)}
              keyboardType={keyboardForField(field)}
              autoCapitalize={field.path.includes("iban") || field.path.includes("swift") ? "characters" : "sentences"}
              placeholder={airwallexFieldPlaceholder(field)}
              placeholderTextColor={colors.textDarkMuted}
              autoCorrect={false}
              style={{
                borderWidth: 1,
                borderColor: colors.cardBorder,
                borderRadius: 8,
                paddingHorizontal: 14,
                paddingVertical: 13,
                fontSize: 16,
                color: colors.textDarkPrimary,
                backgroundColor: colors.cardSoft,
              }}
            />
            {supportingText.map((item) => (
              <AppText key={item} variant="caption" color={colors.textDarkMuted}>{item}</AppText>
            ))}
          </View>
        );
      })}
    </View>
  );
}
