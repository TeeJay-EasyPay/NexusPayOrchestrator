export type PilotCorridor = "GBP->SAR" | "GBP->KWD";
export type PilotAmount = 100 | 500;

export type PilotScenario = {
  scenarioId: string;
  corridor: PilotCorridor;
  amount: PilotAmount;
  testId: string;
};

export const PILOT_CERTIFICATION_SCENARIOS: PilotScenario[] = [
  {
    scenarioId: "pilot-gbp-sar-100",
    corridor: "GBP->SAR",
    amount: 100,
    testId: "QA-CORRIDOR-GBP-SAR-0100",
  },
  {
    scenarioId: "pilot-gbp-sar-500",
    corridor: "GBP->SAR",
    amount: 500,
    testId: "QA-CORRIDOR-GBP-SAR-0500",
  },
  {
    scenarioId: "pilot-gbp-kwd-100",
    corridor: "GBP->KWD",
    amount: 100,
    testId: "QA-CORRIDOR-GBP-KWD-0100",
  },
  {
    scenarioId: "pilot-gbp-kwd-500",
    corridor: "GBP->KWD",
    amount: 500,
    testId: "QA-CORRIDOR-GBP-KWD-0500",
  },
];

const PILOT_TEST_IDS = new Set<string>(
  PILOT_CERTIFICATION_SCENARIOS.map((scenario) => scenario.testId)
);

export function isPilotCertificationTestId(testId: string): boolean {
  return PILOT_TEST_IDS.has(testId);
}

export function getPilotScenarioByTestId(testId: string): PilotScenario | null {
  return PILOT_CERTIFICATION_SCENARIOS.find((scenario) => scenario.testId === testId) ?? null;
}
