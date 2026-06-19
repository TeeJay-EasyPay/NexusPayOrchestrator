export type ExecutiveInsightInput = {
  transfersAnalysed: number;
  completedTransfers: number;
  successRate: number;
  mostActiveCorridor: string;
  highestConfidenceCorridor: string;
  averageRouteScore: number;
  routeConfidence: number;
  xrplUtilisation: number;
};

export type ExecutiveInsight = {
  summary: string;
  recommendation: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
};

export function buildExecutiveInsight(
  input: ExecutiveInsightInput
): ExecutiveInsight {
  const paragraphs: string[] = [];

  if (input.transfersAnalysed === 0) {
    return {
      summary:
        "No operational telemetry is currently available. Additional transfer activity is required before meaningful intelligence can be generated.",
      recommendation:
        "Continue executing transfers to increase telemetry coverage.",
      riskLevel: "MEDIUM",
    };
  }

  paragraphs.push(
    `Transfer activity remains concentrated within the ${input.mostActiveCorridor} corridor, which currently represents the highest observed execution volume.`
  );

  if (input.successRate >= 98) {
    paragraphs.push(
      `Operational performance remains exceptionally strong with a ${input.successRate}% completion rate across analysed transfers and no significant degradation signals detected.`
    );
  } else if (input.successRate >= 90) {
    paragraphs.push(
      `Execution performance remains healthy with a ${input.successRate}% completion rate, although continued monitoring is recommended.`
    );
  } else {
    paragraphs.push(
      `Execution performance has deteriorated below expected operational thresholds and requires investigation.`
    );
  }

  if (input.routeConfidence >= 90) {
    paragraphs.push(
      `Current route confidence remains high, indicating stable corridor conditions and effective orchestration decisions.`
    );
  } else if (input.routeConfidence >= 75) {
    paragraphs.push(
      `Route confidence remains acceptable although corridor conditions should continue to be monitored.`
    );
  } else {
    paragraphs.push(
      `Route confidence has weakened and alternative routing strategies should be considered.`
    );
  }

  let recommendation =
    "Maintain current routing strategy while continuing to monitor corridor telemetry.";

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" = "LOW";

  if (input.successRate < 90 || input.routeConfidence < 75) {
    riskLevel = "HIGH";

    recommendation =
      "Review provider performance, corridor liquidity positioning and routing decisions immediately.";
  } else if (
    input.successRate < 98 ||
    input.routeConfidence < 90
  ) {
    riskLevel = "MEDIUM";

    recommendation =
      "Increase operational monitoring and validate corridor health metrics.";
  }

  return {
    summary: paragraphs.join("\n\n"),
    recommendation,
    riskLevel,
  };
}
