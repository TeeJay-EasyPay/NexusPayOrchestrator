import { View } from "react-native";
import { AppCard } from "../ui/AppCard";
import { AppText } from "../ui/AppText";
import { colors } from "../../theme";
import { mockPaymentMethods } from "../../data/mockPaymentMethods";

export function PaymentMethodsCard() {
  return (
    <AppCard>
      <View style={{ gap: 14 }}>
        <AppText variant="subheading" color={colors.textPrimary}>
          Payment methods
        </AppText>

        {mockPaymentMethods.map((method) => (
          <View
            key={method.id}
            style={{
              padding: 14,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: "#E2E8F0",
              backgroundColor: "#F8FAFC",
              gap: 4,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <AppText variant="body" style={{ fontWeight: "900" }}>
                {method.label}
              </AppText>

              {method.isPrimary ? (
                <AppText variant="caption" style={{ color: colors.gold }}>
                  PRIMARY
                </AppText>
              ) : null}
            </View>

            <AppText variant="caption" color={colors.textSecondary}>
              {method.subtitle}
            </AppText>

            <AppText variant="caption" color={colors.textDarkMuted}>
              {method.provider}
            </AppText>

            <AppText variant="caption" color={colors.textDarkMuted}>
              Funding limit: £{method.fundingLimitGbp}
            </AppText>
          </View>
        ))}

        <View style={{ gap: 8 }}>
          <AppText variant="caption" color={colors.textDarkMuted}>
            Add a card or connect a bank account to fund transfers.
          </AppText>
        </View>
      </View>
    </AppCard>
  );
}
