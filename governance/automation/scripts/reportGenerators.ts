import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { summarizeDefects } from "./defectDiscovery";
import { PilotAggregateSummary } from "./pilotScenarios";

function matrixRows(summary: PilotAggregateSummary): string {
  return summary.results
    .map((result) => {
      return `| ${result.scenario.corridor} | GBP ${result.scenario.amount} | ${result.scenario.testId} | ${result.status} | ${result.reason} | ${path.relative(path.dirname(result.artifacts.evidencePackPath), result.artifacts.evidencePackPath)} |`;
    })
    .join("\n");
}

export function writeCertificationSummary(outputDir: string, summary: PilotAggregateSummary): string {
  mkdirSync(outputDir, { recursive: true });

  const body = [
    "# Sprint 008 Pilot Certification Summary",
    "",
    `Generated at: ${summary.generatedAt}`,
    `Run ID: ${summary.runId}`,
    "",
    "## Execution Totals",
    "",
    `- Total scenarios: ${summary.total}`,
    `- PASS: ${summary.pass}`,
    `- WARNING: ${summary.warning}`,
    `- FAIL: ${summary.fail}`,
    `- Pass rate: ${summary.passRate.toFixed(2)}%`,
    `- Fail rate: ${summary.failRate.toFixed(2)}%`,
    "",
    "## Pass/Fail Matrix",
    "",
    "| Corridor | Amount | Test ID | Outcome | Reason | Evidence |",
    "|---|---|---|---|---|---|",
    matrixRows(summary),
    "",
    "## Evidence References",
    "",
    ...summary.evidenceReferences.map((reference) => `- ${reference}`),
  ].join("\n");

  const filePath = path.join(outputDir, "certification-summary.md");
  writeFileSync(filePath, body);
  return filePath;
}

export function writeFounderBriefingDraft(outputDir: string, summary: PilotAggregateSummary): string {
  const defects = summarizeDefects(summary.results);

  const body = [
    "# Founder Briefing Draft - Sprint 008 Automated Certification Pilot",
    "",
    "## What We Investigated",
    "",
    "We executed the first automated certification pilot using emulator-driven runs for sentinel corridors GBP->SAR and GBP->KWD at GBP 100 and GBP 500.",
    "",
    "## What We Found",
    "",
    `Pilot scenarios executed: ${summary.total}. PASS: ${summary.pass}, WARNING: ${summary.warning}, FAIL: ${summary.fail}.`,
    `Detected defect references: ${defects.uniqueDefects.length > 0 ? defects.uniqueDefects.join(", ") : "None"}.`,
    "",
    "## What This Means For NexusPay",
    "",
    "NexusPay now has an executable pilot certification path that generates evidence and structured outcomes for governed decision making.",
    "",
    "## What Users Experience",
    "",
    "Pilot quality checks can detect corridor-specific failures earlier and reduce risk of unresolved execution issues reaching production-facing confidence claims.",
    "",
    "## Risk Level",
    "",
    summary.fail > 0 ? "High" : summary.warning > 0 ? "Medium" : "Low",
    "",
    "## Recommended Action",
    "",
    "Proceed with controlled pilot hardening: improve failed paths, re-run sentinel suite, and require Testing Director and EQAO evidence approval before expanding corridor coverage.",
    "",
    "## Decision Required From Founder",
    "",
    "Approve continuation of Sprint 008 pilot hardening and authorize a second automated pilot run after remediation of identified failures.",
    "",
    "## Estimated Effort",
    "",
    "Medium",
    "",
    "## Executive Confidence",
    "",
    summary.total > 0 ? "Medium" : "Low",
    "",
    "## Evidence References",
    "",
    ...summary.evidenceReferences.map((reference) => `- ${reference}`),
  ].join("\n");

  const filePath = path.join(outputDir, "founder-briefing-draft.md");
  writeFileSync(filePath, body);
  return filePath;
}

export function writeExecutiveSummary(outputDir: string, summary: PilotAggregateSummary): string {
  const defects = summarizeDefects(summary.results);

  const body = [
    "# Executive Certification Summary - Sprint 008 Pilot",
    "",
    "## Executive Summary",
    "",
    `Automated pilot certification executed ${summary.total} scenarios across GBP->SAR and GBP->KWD for GBP 100 and GBP 500 with pass rate ${summary.passRate.toFixed(2)}%.`,
    "",
    "## Metrics",
    "",
    `- Execution count: ${summary.total}`,
    `- Pass rate: ${summary.passRate.toFixed(2)}%`,
    `- Failure rate: ${summary.failRate.toFixed(2)}%`,
    `- Warning count: ${summary.warning}`,
    `- Defect references: ${defects.total}`,
    "",
    "## Defect Summary",
    "",
    `- Unique defects: ${defects.uniqueDefects.length > 0 ? defects.uniqueDefects.join(", ") : "None"}`,
    ...Object.entries(defects.bySeverity).map(([severity, count]) => `- ${severity}: ${count}`),
    "",
    "## Recommendations",
    "",
    "1. Resolve failed scenario causes and re-run sentinel matrix.",
    "2. Tighten evidence quality checks for warning outcomes.",
    "3. Move to expanded pilot scope only after Testing Director and EQAO quality approval.",
    "",
    "## Evidence References",
    "",
    ...summary.evidenceReferences.map((reference) => `- ${reference}`),
  ].join("\n");

  const filePath = path.join(outputDir, "executive-certification-summary.md");
  writeFileSync(filePath, body);
  return filePath;
}
