import { useEffect, useRef } from "react";
import { Animated, Easing, Image, View } from "react-native";

import { AppText } from "../ui/AppText";

type AnimatedCorridorMapProps = {
  fromLabel?: string;
  toLabel?: string;
  bridgeLabel?: string;
  routeLabel?: string;
  activeStageLabel?: string;
  isCompleted?: boolean;
};

function getActiveNode(stageLabel: string, isCompleted: boolean) {
  const label = stageLabel.toLowerCase();

  if (isCompleted) return "payout";

  if (
    label.includes("rlusd") ||
    label.includes("xrpl") ||
    label.includes("bridge") ||
    label.includes("settlement")
  ) {
    return "bridge";
  }

  if (
    label.includes("payout") ||
    label.includes("recipient") ||
    label.includes("partner")
  ) {
    return "payout";
  }

  return "sender";
}

function SettlementNode({
  label,
  status,
}: {
  label: string;
  status: "active" | "complete" | "pending";
}) {
  const isActive = status === "active";
  const isComplete = status === "complete";

  return (
    <View style={{ alignItems: "center", flex: 1, gap: 6 }}>
      <View
        style={{
          width: isActive ? 18 : 14,
          height: isActive ? 18 : 14,
          borderRadius: 999,
          backgroundColor: isComplete
            ? "#D6A84F"
            : isActive
            ? "#14B8A6"
            : "rgba(255,255,255,0.28)",
          borderWidth: 2,
          borderColor: isActive || isComplete ? "#FFF7D6" : "transparent",
        }}
      />

      <AppText
        variant="caption"
        style={{
          color: isActive || isComplete ? "#F8FAFC" : "#94A3B8",
          fontWeight: isActive ? "800" : "600",
          textAlign: "center",
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

export function AnimatedCorridorMap({
  fromLabel = "London",
  toLabel = "Destination",
  bridgeLabel = "XRPL / RLUSD",
  routeLabel = "Live settlement corridor",
  activeStageLabel = "Preparing transfer route",
  isCompleted = false,
}: AnimatedCorridorMapProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  const activeNode = getActiveNode(activeStageLabel, isCompleted);

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glow, pulse]);

  const pulseTranslate = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 230],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <View
      style={{
        borderRadius: 24,
        backgroundColor: "#062F2F",
        padding: 18,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: "rgba(214, 168, 79, 0.35)",
      }}
    >
      <View
        style={{
          position: "absolute",
          right: -80,
          top: -90,
          width: 220,
          height: 220,
          borderRadius: 110,
          backgroundColor: "rgba(20, 184, 166, 0.12)",
        }}
      />

      <View
        style={{
          position: "absolute",
          left: -110,
          bottom: -130,
          width: 270,
          height: 270,
          borderRadius: 135,
          backgroundColor: "rgba(214, 168, 79, 0.08)",
        }}
      />

      <View style={{ gap: 4, marginBottom: 18 }}>
        <AppText
          variant="subheading"
          style={{ color: "#F8FAFC", fontWeight: "800" }}
        >
          Money Flow
        </AppText>

        <AppText variant="caption" style={{ color: "#A7F3D0" }}>
          {routeLabel}
        </AppText>
      </View>

      <View
        style={{
          height: 170,
          justifyContent: "center",
          position: "relative",
          borderRadius: 22,
          overflow: "hidden",
          backgroundColor: "rgba(3, 26, 26, 0.28)",
        }}
      >
        <Image
          source={require("../../../assets/images/world-map-light.png")}
          resizeMode="contain"
          style={{
            position: "absolute",
            width: "115%",
            height: "115%",
            alignSelf: "center",
            opacity: 0.16,
          }}
        />

        <View
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 84,
            height: 4,
            borderRadius: 999,
            backgroundColor: "rgba(214, 168, 79, 0.32)",
          }}
        />

        <View
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 85,
            height: 1,
            borderRadius: 999,
            backgroundColor: "rgba(255, 247, 214, 0.28)",
          }}
        />

        {!isCompleted ? (
          <Animated.View
            style={{
              position: "absolute",
              left: 22,
              top: 80,
              width: 34,
              height: 12,
              borderRadius: 999,
              backgroundColor: "#D6A84F",
              opacity: glowOpacity,
              transform: [{ translateX: pulseTranslate }],
            }}
          />
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 0,
            top: 60,
            alignItems: "center",
            gap: 8,
            width: 86,
          }}
        >
          <Animated.View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: "#0F766E",
              borderWidth: 2,
              borderColor: "#D6A84F",
              opacity: activeNode === "sender" ? glowOpacity : 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText style={{ color: "#FFFFFF", fontWeight: "900" }}>
              £
            </AppText>
          </Animated.View>

          <AppText
            variant="caption"
            style={{
              color: "#F8FAFC",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {fromLabel}
          </AppText>
        </View>

        <View
          style={{
            position: "absolute",
            left: "38%",
            top: 34,
            alignItems: "center",
            gap: 8,
            maxWidth: 135,
          }}
        >
          <Animated.View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor:
                activeNode === "bridge"
                  ? "rgba(20, 184, 166, 0.95)"
                  : "rgba(15, 118, 110, 0.9)",
              borderWidth: 1,
              borderColor: "#D6A84F",
              opacity: activeNode === "bridge" ? glowOpacity : 1,
            }}
          >
            <AppText
              variant="caption"
              style={{
                color: "#FFFFFF",
                fontWeight: "800",
                textAlign: "center",
              }}
            >
              {bridgeLabel}
            </AppText>
          </Animated.View>

          <AppText
            variant="caption"
            style={{
              color: "#A7F3D0",
              textAlign: "center",
              fontWeight: "700",
            }}
          >
            {isCompleted ? "Settlement complete" : activeStageLabel}
          </AppText>
        </View>

        <View
          style={{
            position: "absolute",
            right: 0,
            top: 60,
            alignItems: "center",
            gap: 8,
            width: 90,
          }}
        >
          <Animated.View
            style={{
              width: 46,
              height: 46,
              borderRadius: 23,
              backgroundColor: isCompleted ? "#D6A84F" : "#334155",
              borderWidth: 2,
              borderColor: isCompleted ? "#FFF7D6" : "#94A3B8",
              opacity:
                activeNode === "payout" && !isCompleted ? glowOpacity : 1,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AppText
              style={{
                color: isCompleted ? "#062F2F" : "#FFFFFF",
                fontWeight: "900",
              }}
            >
              {isCompleted ? "✓" : "•"}
            </AppText>
          </Animated.View>

          <AppText
            variant="caption"
            style={{
              color: "#F8FAFC",
              fontWeight: "700",
              textAlign: "center",
            }}
          >
            {toLabel}
          </AppText>
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          gap: 8,
          marginTop: 16,
          marginBottom: 12,
        }}
      >
        <SettlementNode
          label="Sender reserve"
          status={
            activeNode === "sender"
              ? "active"
              : activeNode === "bridge" || activeNode === "payout"
              ? "complete"
              : "pending"
          }
        />

        <SettlementNode
          label="Bridge rail"
          status={
            activeNode === "bridge"
              ? "active"
              : activeNode === "payout"
              ? "complete"
              : "pending"
          }
        />

        <SettlementNode
          label="Payout partner"
          status={
            isCompleted
              ? "complete"
              : activeNode === "payout"
              ? "active"
              : "pending"
          }
        />
      </View>

      <View
        style={{
          marginTop: 8,
          padding: 12,
          borderRadius: 16,
          backgroundColor: isCompleted
            ? "rgba(214, 168, 79, 0.18)"
            : "rgba(255, 255, 255, 0.08)",
          borderWidth: isCompleted ? 1 : 0,
          borderColor: "rgba(214, 168, 79, 0.5)",
        }}
      >
        <AppText variant="caption" style={{ color: "#F8FAFC" }}>
          {isCompleted
            ? "Funds have arrived at the destination payout partner and the transfer is complete."
            : activeStageLabel}
        </AppText>
      </View>
    </View>
  );
}