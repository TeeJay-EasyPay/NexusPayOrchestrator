declare const Deno: {
  env: { get: (key: string) => string | undefined };
  serve: (handler: (request: Request) => Response | Promise<Response>) => void;
};

type NexusAISensitivity = "conservative" | "balanced" | "aggressive";
type NexusAIAction =
  | "dashboard_summary"
  | "route_explanation"
  | "transfer_analysis"
  | "intelligence_report";

type NexusAIRequest = {
  action?: NexusAIAction;
  screenContext?: string;
  sensitivity?: NexusAISensitivity;
  payload?: Record<string, unknown>;
};

type NexusAIError = {
  code: string;
  message: string;
  retryable: boolean;
};

type SuccessResponse = {
  ok: true;
  requestId: string;
  data: Record<string, unknown>;
};

type ErrorResponse = {
  ok: false;
  requestId: string;
  error: NexusAIError;
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: SuccessResponse | ErrorResponse, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
    },
  });
}

function makeRequestId() {
  return `nexus-ai-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() || fallback : fallback;
}

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asStringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;

  const next = value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);

  return next.length > 0 ? next : fallback;
}

function assertSensitivity(value: unknown): NexusAISensitivity {
  if (value === "conservative" || value === "balanced" || value === "aggressive") {
    return value;
  }

  return "balanced";
}

function assertAction(value: unknown): NexusAIAction {
  if (
    value === "dashboard_summary" ||
    value === "route_explanation" ||
    value === "transfer_analysis" ||
    value === "intelligence_report"
  ) {
    return value;
  }

  throw new Error("Unsupported action");
}

function validatePayload(action: NexusAIAction, payload: Record<string, unknown>) {
  if (action === "dashboard_summary") {
    const telemetry = asObject(payload.telemetry);
    if (!telemetry) {
      throw new Error("dashboard_summary requires telemetry payload");
    }

    return {
      telemetry: {
        treasuryStatus: asString(telemetry.treasuryStatus, "Unknown"),
        liquidityStatus: asString(telemetry.liquidityStatus, "Unknown"),
        corridorHealth: asString(telemetry.corridorHealth, "Unknown"),
        networkHealth: asString(telemetry.networkHealth, "Unknown"),
        fxStatus: asString(telemetry.fxStatus, "Unknown"),
        marketStatus: asString(telemetry.marketStatus, "Unknown"),
        activeTransferCount: asNumber(telemetry.activeTransferCount, 0),
        corridorCoverage: asString(telemetry.corridorCoverage, "--"),
      },
    };
  }

  if (action === "route_explanation") {
    return {
      corridor: asString(payload.corridor, "Unknown corridor"),
      routeScore: asNumber(payload.routeScore, 0),
      liquidityScore: asNumber(payload.liquidityScore, 0),
      treasuryScore: asNumber(payload.treasuryScore, 0),
      settlementEstimate: asString(payload.settlementEstimate, "Unknown"),
    };
  }

  if (action === "transfer_analysis") {
    const milestonesRaw = Array.isArray(payload.milestones) ? payload.milestones : [];
    const eventsRaw = Array.isArray(payload.operationalEvents) ? payload.operationalEvents : [];

    return {
      transferId: asString(payload.transferId, "unknown-transfer"),
      transferState: asString(payload.transferState, "UNKNOWN"),
      progressPercent: asNumber(payload.progressPercent, 0),
      settlementCommentary: asString(payload.settlementCommentary, "No settlement commentary provided."),
      milestones: milestonesRaw
        .map((item) => asObject(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .slice(0, 10)
        .map((item) => ({
          title: asString(item.title, "Execution step"),
          status: asString(item.status, "PENDING"),
        })),
      operationalEvents: eventsRaw
        .map((item) => asObject(item))
        .filter((item): item is Record<string, unknown> => Boolean(item))
        .slice(0, 10)
        .map((item) => ({
          label: asString(item.label, "event"),
          value: asString(item.value, "n/a"),
        })),
    };
  }

  return {
    reportType: asString(payload.reportType, "corridor_analysis"),
    focus: asString(payload.focus, "NexusPay intelligence"),
    telemetry: asObject(payload.telemetry) ?? {},
  };
}

function sensitivityInstruction(sensitivity: NexusAISensitivity) {
  if (sensitivity === "conservative") {
    return {
      depth: "Prioritise certainty, caveats and factual wording.",
      style: "Use restrained and risk-aware commentary.",
      temperature: 0.2,
    };
  }

  if (sensitivity === "aggressive") {
    return {
      depth: "Provide deeper comparative reasoning and proactive observations.",
      style: "Use direct and energetic commentary while staying factual.",
      temperature: 0.7,
    };
  }

  return {
    depth: "Use balanced depth with clear recommendations and caveats.",
    style: "Use professional executive commentary.",
    temperature: 0.45,
  };
}

function buildPrompt(action: NexusAIAction, payload: Record<string, unknown>) {
  if (action === "dashboard_summary") {
    return [
      "Return ONLY valid JSON with keys: title, executiveSummary, highlights, confidence.",
      "- title: string",
      "- executiveSummary: array of 3-5 concise strings",
      "- highlights: array of 2-4 concise strings",
      "- confidence: LOW | MEDIUM | HIGH",
      "Ground all statements in provided telemetry and do not invent external facts.",
      `Input: ${JSON.stringify(payload)}`,
    ].join("\n");
  }

  if (action === "route_explanation") {
    return [
      "Return ONLY valid JSON with keys: title, bullets, confidence.",
      "- title: string and should usually be 'Why this route?'",
      "- bullets: array of 3-4 concise reason strings",
      "- confidence: LOW | MEDIUM | HIGH",
      "Use the provided route score, liquidity score, treasury score and settlement estimate.",
      `Input: ${JSON.stringify(payload)}`,
    ].join("\n");
  }

  if (action === "transfer_analysis") {
    return [
      "Return ONLY valid JSON with keys: title, progressAnalysis, settlementCommentary, milestoneAnalysis, operationalCommentary, confidence.",
      "- title: string",
      "- progressAnalysis: short sentence",
      "- settlementCommentary: short sentence",
      "- milestoneAnalysis: array of 2-4 strings",
      "- operationalCommentary: array of 2-4 strings",
      "- confidence: LOW | MEDIUM | HIGH",
      "Use only provided transfer telemetry and milestones.",
      `Input: ${JSON.stringify(payload)}`,
    ].join("\n");
  }

  return [
    "Return ONLY valid JSON with keys: executiveSummary, keyFindings, supportingEvidence, methodology, assumptions, confidenceIndicators.",
    "- executiveSummary: string",
    "- keyFindings: array of 3-5 strings",
    "- supportingEvidence: array of 2-5 strings",
    "- methodology: array of 2-4 strings",
    "- assumptions: array of 2-4 strings",
    "- confidenceIndicators: array of 2-4 strings",
    "Use only provided telemetry and maintain advisory-only framing.",
    `Input: ${JSON.stringify(payload)}`,
  ].join("\n");
}

function extractJson(text: string): Record<string, unknown> {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");

    if (start >= 0 && end > start) {
      const candidate = trimmed.slice(start, end + 1);
      return JSON.parse(candidate) as Record<string, unknown>;
    }

    throw new Error("Model response did not contain valid JSON");
  }
}

function normalizeModelOutput(action: NexusAIAction, output: Record<string, unknown>) {
  if (action === "dashboard_summary") {
    return {
      title: asString(output.title, "Nexus AI Summary"),
      executiveSummary: asStringArray(output.executiveSummary, [
        "Treasury capacity remains stable.",
        "Primary corridor performance remains healthy.",
        "No immediate operational concerns detected.",
      ]),
      highlights: asStringArray(output.highlights, ["AI advisory mode active"]),
      confidence: asString(output.confidence, "MEDIUM").toUpperCase(),
    };
  }

  if (action === "route_explanation") {
    return {
      title: asString(output.title, "Why this route?"),
      bullets: asStringArray(output.bullets, [
        "Settlement estimate aligns with current route profile.",
        "Liquidity and treasury conditions support execution quality.",
      ]),
      confidence: asString(output.confidence, "MEDIUM").toUpperCase(),
    };
  }

  if (action === "transfer_analysis") {
    return {
      title: asString(output.title, "Transfer intelligence"),
      progressAnalysis: asString(output.progressAnalysis, "Transfer is progressing through execution stages."),
      settlementCommentary: asString(
        output.settlementCommentary,
        "Settlement commentary is based on current execution telemetry."
      ),
      milestoneAnalysis: asStringArray(output.milestoneAnalysis, ["Milestone evaluation in progress."]),
      operationalCommentary: asStringArray(output.operationalCommentary, ["Operational telemetry remains available."]),
      confidence: asString(output.confidence, "MEDIUM").toUpperCase(),
    };
  }

  return {
    executiveSummary: asString(
      output.executiveSummary,
      "AI report generated using available NexusPay intelligence telemetry."
    ),
    keyFindings: asStringArray(output.keyFindings, ["No key findings were returned by the model."]),
    supportingEvidence: asStringArray(output.supportingEvidence, ["Telemetry payload reviewed."]),
    methodology: asStringArray(output.methodology, ["Structured prompt analysis"]),
    assumptions: asStringArray(output.assumptions, ["Input telemetry is current."]),
    confidenceIndicators: asStringArray(output.confidenceIndicators, ["Confidence medium"]),
  };
}

async function callOpenAI(params: {
  apiKey: string;
  action: NexusAIAction;
  sensitivity: NexusAISensitivity;
  payload: Record<string, unknown>;
}) {
  const sensitivity = sensitivityInstruction(params.sensitivity);
  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: sensitivity.temperature,
      messages: [
        {
          role: "system",
          content: [
            "You are Nexus AI for a financial orchestration platform.",
            "AI output is advisory only and must not trigger execution workflows.",
            "Do not invent facts not present in input.",
            sensitivity.depth,
            sensitivity.style,
          ].join(" "),
        },
        {
          role: "user",
          content: buildPrompt(params.action, params.payload),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${body.slice(0, 300)}`);
  }

  const json = await response.json();
  const content =
    json?.choices?.[0]?.message?.content && typeof json.choices[0].message.content === "string"
      ? json.choices[0].message.content
      : "";

  if (!content) {
    throw new Error("OpenAI returned an empty completion");
  }

  const parsed = extractJson(content);
  return normalizeModelOutput(params.action, parsed);
}

Deno.serve(async (request) => {
  const requestId = makeRequestId();

  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        requestId,
        error: {
          code: "METHOD_NOT_ALLOWED",
          message: "Only POST is supported",
          retryable: false,
        },
      },
      405
    );
  }

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return jsonResponse(
        {
          ok: false,
          requestId,
          error: {
            code: "MISSING_SECRET",
            message: "OPENAI_API_KEY is not configured in Supabase Secrets",
            retryable: false,
          },
        },
        500
      );
    }

    const body = (await request.json()) as NexusAIRequest;
    const action = assertAction(body.action);
    const sensitivity = assertSensitivity(body.sensitivity);
    const payload = validatePayload(action, asObject(body.payload) ?? {});

    const data = await callOpenAI({
      apiKey,
      action,
      sensitivity,
      payload,
    });

    return jsonResponse({
      ok: true,
      requestId,
      data,
    });
  } catch (error) {
    const message = getErrorMessage(error);

    return jsonResponse(
      {
        ok: false,
        requestId,
        error: {
          code: "NEXUS_AI_REQUEST_FAILED",
          message,
          retryable: true,
        },
      },
      500
    );
  }
});
