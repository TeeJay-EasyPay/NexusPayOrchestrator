import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

import { AppText } from "../ui/AppText";

type WorldCorridorMapProps = {
  fromLabel?: string;
  toLabel?: string;
  routeLabel?: string;
  activeStageLabel?: string;
  isCompleted?: boolean;
};

export function WorldCorridorMap({
  fromLabel = "United Kingdom",
  toLabel = "Destination",
  routeLabel = "Global corridor route",
  activeStageLabel = "Preparing corridor",
  isCompleted = false,
}: WorldCorridorMapProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(pulse, {
        toValue: 1,
        duration: 2600,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [glow, pulse]);

  const pulseTranslateX = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 245],
  });

  const pulseTranslateY = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, -42, 0],
  });

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <View
      style={{
        borderRadius: 28,
        backgroundColor: "#031A1A",
        padding: 18,
        borderWidth: 1,
        borderColor: "rgba(214, 168, 79, 0.35)",
        overflow: "hidden",
      }}
    >
      <View style={{ gap: 4, marginBottom: 14 }}>
        <AppText
          variant="subheading"
          style={{ color: "#F8FAFC", fontWeight: "900" }}
        >
          Global Corridor
        </AppText>

        <AppText variant="caption" style={{ color: "#A7F3D0" }}>
          {routeLabel}
        </AppText>
      </View>

      <View
        style={{
          height: 205,
          borderRadius: 24,
          backgroundColor: "#052727",
          overflow: "hidden",
          position: "relative",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.06)",
        }}
      >
        <View
          style={{
            position: "absolute",
            left: -40,
            top: -40,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: "rgba(20, 184, 166, 0.12)",
          }}
        />

        <View
          style={{
            position: "absolute",
            right: -42,
            bottom: -42,
            width: 170,
            height: 170,
            borderRadius: 85,
            backgroundColor: "rgba(214, 168, 79, 0.09)",
          }}
        />

        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4, 5].map((col) => (
            <View
              key={`${row}-${col}`}
              style={{
                position: "absolute",
                left: 34 + col * 55,
                top: 28 + row * 34,
                width: 3,
                height: 3,
                borderRadius: 2,
                backgroundColor: "rgba(167, 243, 208, 0.16)",
              }}
            />
          ))
        )}

        <View
          style={{
            position: "absolute",
            left: 54,
            top: 116,
            width: 285,
            height: 86,
            borderTopWidth: 3,
            borderColor: "rgba(214, 168, 79, 0.58)",
            borderRadius: 260,
            transform: [{ rotate: "-15deg" }],
          }}
        />

        <View
          style={{
            position: "absolute",
            left: 54,
            top: 117,
            width: 285,
            height: 86,
            borderTopWidth: 1,
            borderColor: "rgba(255, 247, 214, 0.25)",
            borderRadius: 260,
            transform: [{ rotate: "-15deg" }],
          }}
        />

        {!isCompleted ? (
          <Animated.View
            style={{
              position: "absolute",
              left: 66,
              top: 122,
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: "#D6A84F",
              opacity: glowOpacity,
              transform: [
                { translateX: pulseTranslateX },
                { translateY: pulseTranslateY },
              ],
            }}
          />
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 24,
            bottom: 26,
            alignItems: "center",
            gap: 8,
            width: 96,
          }}
        >
          <Animated.View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
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
            style={{
              color: "#F8FAFC",
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {fromLabel}
          </AppText>
        </View>

        <View
          style={{
            position: "absolute",
            right: 24,
            top: 26,
            alignItems: "center",
            gap: 8,
            width: 100,
          }}
        >
          <Animated.View
            style={{
              width: 54,
              height: 54,
              borderRadius: 27,
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
            style={{
              color: "#F8FAFC",
              fontWeight: "800",
              textAlign: "center",
            }}
          >
            {toLabel}
          </AppText>
        </View>

        <View
          style={{
            position: "absolute",
            left: 22,
            right: 22,
            top: 18,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 999,
            backgroundColor: "rgba(3, 26, 26, 0.72)",
            borderWidth: 1,
            borderColor: "rgba(214, 168, 79, 0.32)",
          }}
        >
          <AppText
            variant="caption"
            style={{
              color: "#A7F3D0",
              textAlign: "center",
              fontWeight: "800",
            }}
            numberOfLines={1}
          >
            {isCompleted ? "Corridor settled" : activeStageLabel}
          </AppText>
        </View>
      </View>
    </View>
  );
}