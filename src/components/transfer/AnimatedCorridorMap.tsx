import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { AppText } from "../ui/AppText";

type AnimatedCorridorMapProps = {
  fromLabel?: string;
  toLabel?: string;
  bridgeLabel?: string;
  routeLabel?: string;
  activeStageLabel?: string;
  isCompleted?: boolean;
};

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
      }}
    >
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
          height: 150,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 72,
            height: 4,
            borderRadius: 999,
            backgroundColor: "rgba(214, 168, 79, 0.35)",
          }}
        />

        {!isCompleted ? (
          <Animated.View
            style={{
              position: "absolute",
              left: 22,
              top: 69,
              width: 34,
              height: 10,
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
            top: 48,
            alignItems: "center",
            gap: 8,
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
              opacity: glowOpacity,
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
            style={{ color: "#F8FAFC", fontWeight: "700" }}
          >
            {fromLabel}
          </AppText>
        </View>

        <View
          style={{
            position: "absolute",
            left: "38%",
            top: 28,
            alignItems: "center",
            gap: 8,
            maxWidth: 135,
          }}
        >
          <View
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "rgba(15, 118, 110, 0.9)",
              borderWidth: 1,
              borderColor: "#D6A84F",
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
          </View>

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
            top: 48,
            alignItems: "center",
            gap: 8,
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
              opacity: isCompleted ? 1 : glowOpacity,
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
            style={{ color: "#F8FAFC", fontWeight: "700" }}
          >
            {toLabel}
          </AppText>
        </View>
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