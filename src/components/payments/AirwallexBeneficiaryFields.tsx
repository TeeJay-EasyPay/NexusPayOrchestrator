import { Pressable, TextInput, View } from "react-native";

import {
  AirwallexBeneficiaryField,
  AirwallexBeneficiarySchema,
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

export function AirwallexBeneficiaryFields({
  schema,
  loading,
  error,
  values,
  fixedValues,
  onChange,
  onRetry,
}: {
  schema: AirwallexBeneficiarySchema | null;
  loading: boolean;
  error: string | null;
  values: Record<string, string>;
  fixedValues: Record<string, string>;
  onChange: (path: string, value: string) => void;
  onRetry: () => void;
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
            {schema ? `${schema.transferMethod} payout fields returned by Airwallex` : "Loading provider requirements"}
          </AppText>
        </View>
        <DataProvenanceBadge classification="SANDBOX" />
      </View>

      {loading ? <AppText variant="caption" color={colors.textDarkSecondary}>Checking Airwallex sandbox requirements...</AppText> : null}

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
        if (options.length > 0 && options.length <= 8) {
          return (
            <View key={field.path} style={{ gap: 7 }}>
              <AppText variant="caption" color={colors.textDarkSecondary}>
                {field.label}{field.required ? " *" : ""}
              </AppText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                {options.map((option) => {
                  const selected = option.value === value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => onChange(field.path, option.value)}
                      style={{
                        paddingVertical: 9,
                        paddingHorizontal: 12,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: selected ? colors.gold : colors.cardBorder,
                        backgroundColor: selected ? colors.goldSoft : colors.cardSoft,
                      }}
                    >
                      <AppText variant="caption" color={colors.textDarkPrimary} style={{ fontWeight: "800" }}>
                        {option.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        }

        return (
          <View key={field.path} style={{ gap: 6 }}>
            <AppText variant="caption" color={colors.textDarkSecondary}>
              {field.label}{field.required ? " *" : ""}
            </AppText>
            <TextInput
              value={value}
              onChangeText={(nextValue) => onChange(field.path, nextValue)}
              keyboardType={keyboardForField(field)}
              autoCapitalize={field.path.includes("iban") || field.path.includes("swift") ? "characters" : "sentences"}
              placeholder={field.placeholder || field.label}
              placeholderTextColor={colors.textDarkMuted}
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
            {field.description ? <AppText variant="caption" color={colors.textDarkMuted}>{field.description}</AppText> : null}
          </View>
        );
      })}
    </View>
  );
}
