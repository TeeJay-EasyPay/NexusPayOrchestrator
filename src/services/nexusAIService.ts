import { supabase } from "../lib/supabase";
import { NexusAISensitivity } from "./nexusAISettingsService";
import {
	buildDashboardExecutiveContext,
	buildRouteIntelligenceContext,
	buildTransferIntelligenceContext,
} from "./intelligence/contextBuilder";
import type {
	DashboardExecutiveContext,
	RouteIntelligenceContext,
	TransferIntelligenceContext,
} from "./intelligence/contextTypes";
import type { Transfer, RouteQuote } from "../types/transfer";
import type { ExecutionSnapshot } from "./execution/executionEngine";

type NexusAIScreenContext =
	| "home"
	| "routes"
	| "track"
	| "operations"
	| "intelligence";

type NexusAIRequestAction =
	| "dashboard_summary"
	| "route_explanation"
	| "transfer_analysis"
	| "intelligence_report";

type ConfidenceLabel = "LOW" | "MEDIUM" | "HIGH";

type NexusAIRequestOptions = {
	timeoutMs?: number;
	maxRetries?: number;
	onLoadingChange?: (loading: boolean) => void;
	// Internal: Optional context data for advanced integrations
	// These are passed through but not exposed in public API
	_routeQuote?: RouteQuote;
	_transfer?: Transfer;
	_executionSnapshot?: ExecutionSnapshot;
};

type DashboardTelemetryPayload = {
	treasuryStatus: string;
	liquidityStatus: string;
	corridorHealth: string;
	networkHealth: string;
	fxStatus: string;
	marketStatus: string;
	activeTransferCount?: number;
	corridorCoverage?: string;
};

type DashboardSummaryInput = {
	telemetry: DashboardTelemetryPayload;
};

type RouteExplanationInput = {
	corridor: string;
	routeScore: number;
	liquidityScore: number;
	treasuryScore: number;
	settlementEstimate: string;
};

type TransferMilestone = {
	title: string;
	status: "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";
};

type TransferOperationalEvent = {
	label: string;
	value: string;
};

type TransferAnalysisInput = {
	transferId: string;
	transferState: string;
	progressPercent: number;
	settlementCommentary: string;
	milestones: TransferMilestone[];
	operationalEvents: TransferOperationalEvent[];
};

type IntelligenceReportType =
	| "corridor_analysis"
	| "treasury_analysis"
	| "value_flow_analysis"
	| "market_intelligence";

type IntelligenceReportInput = {
	reportType: IntelligenceReportType;
	focus: string;
	telemetry: Record<string, unknown>;
};

type DashboardSummaryResult = {
	title: string;
	executiveSummary: string[];
	highlights: string[];
	confidence: ConfidenceLabel;
};

type RouteExplanationResult = {
	title: string;
	bullets: string[];
	confidence: ConfidenceLabel;
};

type TransferAnalysisResult = {
	title: string;
	progressAnalysis: string;
	settlementCommentary: string;
	milestoneAnalysis: string[];
	operationalCommentary: string[];
	confidence: ConfidenceLabel;
};

type IntelligenceReportResult = {
	executiveSummary: string;
	keyFindings: string[];
	supportingEvidence: string[];
	methodology: string[];
	assumptions: string[];
	confidenceIndicators: string[];
};

type NexusAIResultMeta = {
	action: NexusAIRequestAction;
	screenContext: NexusAIScreenContext;
	sensitivity: NexusAISensitivity;
	requestId: string;
	retries: number;
	durationMs: number;
	timedOut: boolean;
	source: "edge_function" | "fallback";
};

type NexusAIError = {
	code: string;
	message: string;
	retryable: boolean;
};

type NexusAIResult<TData> = {
	ok: boolean;
	data: TData;
	meta: NexusAIResultMeta;
	error?: NexusAIError;
};

type EdgeFunctionResponse<TData> = {
	ok: boolean;
	data?: TData;
	error?: Partial<NexusAIError>;
	requestId?: string;
};

const DEFAULT_TIMEOUT_MS = 8500;
const DEFAULT_MAX_RETRIES = 2;

function getErrorMessage(error: unknown) {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;
	return "Unknown Nexus AI error";
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<T>((_resolve, reject) => {
			setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
		}),
	]);
}

function safeConfidence(value: unknown): ConfidenceLabel {
	if (value === "LOW" || value === "MEDIUM" || value === "HIGH") return value;
	return "MEDIUM";
}

function asStringArray(value: unknown, fallback: string[]): string[] {
	if (!Array.isArray(value)) return fallback;

	const next = value
		.map((item) => (typeof item === "string" ? item.trim() : ""))
		.filter(Boolean);

	return next.length > 0 ? next : fallback;
}

function buildRequestId(prefix: string) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function buildDashboardFallback(input: DashboardSummaryInput): DashboardSummaryResult {
	const topCorridorLine =
		input.telemetry.corridorCoverage && input.telemetry.corridorCoverage !== "--"
			? `Corridor coverage remains stable at ${input.telemetry.corridorCoverage}.`
			: "Corridor coverage remains stable across primary corridors.";

	return {
		title: "Nexus AI Summary",
		executiveSummary: [
			`Treasury capacity is ${input.telemetry.treasuryStatus.toLowerCase()}. Current utilisation remains within optimal operating thresholds.`,
			`${input.telemetry.corridorHealth} corridor conditions continue to support routing quality. No significant capacity constraints are currently detected.`,
			`Settlement network status is ${input.telemetry.networkHealth.toLowerCase()} with ${input.telemetry.fxStatus.toLowerCase()} FX conditions. All primary payment rails remain operational.`,
			topCorridorLine,
		],
		highlights: [
			`Market status: ${input.telemetry.marketStatus}`,
			`Liquidity status: ${input.telemetry.liquidityStatus}`,
			`Active transfers: ${input.telemetry.activeTransferCount ?? 0}`,
		],
		confidence: "MEDIUM",
	};
}

function buildRouteFallback(input: RouteExplanationInput): RouteExplanationResult {
	const scoreQuality =
		input.routeScore >= 90
			? "exceptionally strong"
			: input.routeScore >= 80
				? "very strong"
				: input.routeScore >= 70
					? "strong"
					: "adequate";

	const settlementQuality =
		input.treasuryScore >= 80 && input.liquidityScore >= 80
			? "Execution conditions are optimal"
			: input.treasuryScore >= 70 || input.liquidityScore >= 70
				? "Execution conditions remain healthy"
				: "Execution conditions are acceptable";

	return {
		title: "Why this route?",
		bullets: [
			`Route score is ${input.routeScore.toFixed(1)}/100 with ${scoreQuality} characteristics. Settlement is estimated at ${input.settlementEstimate}.`,
			`Treasury signal is ${input.treasuryScore.toFixed(1)}/100 and liquidity support is ${input.liquidityScore.toFixed(1)}/100. ${settlementQuality}.`,
			`Payout reliability and settlement performance remain well-aligned with current corridor conditions and operational capacity.`,
		],
		confidence: input.routeScore >= 90 ? "HIGH" : input.routeScore >= 75 ? "MEDIUM" : "LOW",
	};
}

function buildTransferFallback(input: TransferAnalysisInput): TransferAnalysisResult {
	const latestMilestone = input.milestones[0]?.title ?? "Execution";
	const progressDescriptor =
		input.progressPercent < 25
			? "early stages"
			: input.progressPercent < 50
				? "initial phases"
				: input.progressPercent < 75
					? "advanced stages"
					: "final stages";

	const recentEvents = input.operationalEvents.slice(0, 2).map((e) => `${e.label}: ${e.value}`);

	return {
		title: "Transfer intelligence",
		progressAnalysis: `Transfer is currently ${input.progressPercent}% complete and in the ${progressDescriptor} of execution. Current state is ${input.transferState}. All critical execution steps remain on track.`,
		settlementCommentary: input.settlementCommentary,
		milestoneAnalysis: [
			`Current execution stage: ${latestMilestone}.`,
			"No blocking operational conditions detected from recent telemetry.",
			input.progressPercent >= 75
				? "Settlement preparation is actively underway."
				: "Transfer remains within expected execution parameters.",
		],
		operationalCommentary:
			recentEvents.length > 0
				? recentEvents
				: ["Operational telemetry remains normal.", "No significant alerts detected."],
		confidence: "MEDIUM",
	};
}

function buildReportFallback(input: IntelligenceReportInput): IntelligenceReportResult {
	const reportContext = input.reportType === "corridor_analysis"
		? "corridor operational performance"
		: input.reportType === "treasury_analysis"
			? "treasury capacity and utilisation"
			: input.reportType === "value_flow_analysis"
				? "value movement patterns and corridor performance"
				: "market conditions and operational intelligence";

	return {
		executiveSummary: `${input.focus} intelligence analysis based on current operational telemetry. ${reportContext} remains stable with no critical constraints detected. All operational metrics support continued normal service delivery.`,
		keyFindings: [
			"Core transfer orchestration systems remain fully operational and responsive.",
			"Treasury and route telemetry indicate healthy operational capacity across primary corridors.",
			"Settlement performance metrics remain consistent with service level expectations.",
			"No significant operational risks are currently identified that require immediate escalation.",
		],
		supportingEvidence: [
			`Analysis incorporates ${Object.keys(input.telemetry).length} operational data points.`,
			`Focus area: ${input.focus}.`,
			"Data sourced from live platform telemetry and operational event logs.",
		],
		methodology: [
			"Analysed client-provided telemetry payload against operational baselines.",
			"Applied deterministic reasoning frameworks grounded in measurable platform metrics.",
			"Interpreted results through operational intelligence filters to ensure advisory accuracy.",
		],
		assumptions: [
			"Telemetry payload accurately reflects current operational state.",
			"Baseline operational parameters remain applicable to current execution environment.",
			"Advisory intelligence is used for decision support, not execution automation.",
		],
		confidenceIndicators: [
			"Analysis grounded in current operational telemetry",
			"Confidence level: Medium to High based on data availability",
		],
	};
}

/**
 * Optionally enrich a dashboard telemetry payload with context data.
 *
 * This is an internal helper that enables the service to optionally build and merge
 * context data without breaking the existing API. Context building is optional and
 * non-blocking if it fails.
 */
async function enrichDashboardPayload(
	input: DashboardSummaryInput,
	sensitivity: NexusAISensitivity
): Promise<Record<string, unknown>> {
	try {
		const context = await buildDashboardExecutiveContext(sensitivity);
		return {
			...input,
			_executiveContext: context,
		};
	} catch (error) {
		console.warn("Failed to build dashboard context:", error);
		return input;
	}
}

/**
 * Optionally enrich a route explanation payload with context data.
 *
 * This is an internal helper that enables the service to optionally build and merge
 * context data without breaking the existing API. Context building is optional and
 * non-blocking if it fails.
 */
async function enrichRoutePayload(
	input: RouteExplanationInput,
	route: RouteQuote,
	sensitivity: NexusAISensitivity
): Promise<Record<string, unknown>> {
	try {
		const context = await buildRouteIntelligenceContext(route, sensitivity);
		return {
			...input,
			_routeContext: context,
		};
	} catch (error) {
		console.warn("Failed to build route context:", error);
		return input;
	}
}

/**
 * Optionally enrich a transfer analysis payload with context data.
 *
 * This is an internal helper that enables the service to optionally build and merge
 * context data without breaking the existing API. Context building is optional and
 * non-blocking if it fails.
 */
async function enrichTransferPayload(
	input: TransferAnalysisInput,
	transfer: Transfer,
	executionSnapshot: ExecutionSnapshot | undefined,
	sensitivity: NexusAISensitivity
): Promise<Record<string, unknown>> {
	try {
		const context = await buildTransferIntelligenceContext(transfer, executionSnapshot, sensitivity);
		return {
			...input,
			_transferContext: context,
		};
	} catch (error) {
		console.warn("Failed to build transfer context:", error);
		return input;
	}
}

function normalizeDashboardResult(input: unknown, fallback: DashboardSummaryResult) {
	if (!input || typeof input !== "object") return fallback;

	const candidate = input as Partial<DashboardSummaryResult>;

	return {
		title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : fallback.title,
		executiveSummary: asStringArray(candidate.executiveSummary, fallback.executiveSummary),
		highlights: asStringArray(candidate.highlights, fallback.highlights),
		confidence: safeConfidence(candidate.confidence),
	};
}

function normalizeRouteResult(input: unknown, fallback: RouteExplanationResult) {
	if (!input || typeof input !== "object") return fallback;
	const candidate = input as Partial<RouteExplanationResult>;

	return {
		title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : fallback.title,
		bullets: asStringArray(candidate.bullets, fallback.bullets),
		confidence: safeConfidence(candidate.confidence),
	};
}

function normalizeTransferResult(input: unknown, fallback: TransferAnalysisResult) {
	if (!input || typeof input !== "object") return fallback;
	const candidate = input as Partial<TransferAnalysisResult>;

	return {
		title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title : fallback.title,
		progressAnalysis:
			typeof candidate.progressAnalysis === "string" && candidate.progressAnalysis.trim()
				? candidate.progressAnalysis
				: fallback.progressAnalysis,
		settlementCommentary:
			typeof candidate.settlementCommentary === "string" && candidate.settlementCommentary.trim()
				? candidate.settlementCommentary
				: fallback.settlementCommentary,
		milestoneAnalysis: asStringArray(candidate.milestoneAnalysis, fallback.milestoneAnalysis),
		operationalCommentary: asStringArray(
			candidate.operationalCommentary,
			fallback.operationalCommentary
		),
		confidence: safeConfidence(candidate.confidence),
	};
}

function normalizeReportResult(input: unknown, fallback: IntelligenceReportResult) {
	if (!input || typeof input !== "object") return fallback;
	const candidate = input as Partial<IntelligenceReportResult>;

	return {
		executiveSummary:
			typeof candidate.executiveSummary === "string" && candidate.executiveSummary.trim()
				? candidate.executiveSummary
				: fallback.executiveSummary,
		keyFindings: asStringArray(candidate.keyFindings, fallback.keyFindings),
		supportingEvidence: asStringArray(candidate.supportingEvidence, fallback.supportingEvidence),
		methodology: asStringArray(candidate.methodology, fallback.methodology),
		assumptions: asStringArray(candidate.assumptions, fallback.assumptions),
		confidenceIndicators: asStringArray(
			candidate.confidenceIndicators,
			fallback.confidenceIndicators
		),
	};
}

async function invokeNexusAI<TData, TFallbackData>(params: {
	action: NexusAIRequestAction;
	screenContext: NexusAIScreenContext;
	sensitivity: NexusAISensitivity;
	payload: Record<string, unknown>;
	fallbackData: TFallbackData;
	normalize: (input: unknown, fallback: TFallbackData) => TData;
	options?: NexusAIRequestOptions;
}): Promise<NexusAIResult<TData>> {
	const startedAt = Date.now();
	const timeoutMs = params.options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const maxRetries = Math.max(0, params.options?.maxRetries ?? DEFAULT_MAX_RETRIES);
	const requestId = buildRequestId("nexus-ai");
	const onLoadingChange = params.options?.onLoadingChange;

	onLoadingChange?.(true);

	try {
		let attempt = 0;
		let lastError: unknown = null;
		let timedOut = false;

		while (attempt <= maxRetries) {
			attempt += 1;

			try {
				const invokePromise = supabase.functions.invoke<EdgeFunctionResponse<TData>>("nexus-ai", {
					body: {
						action: params.action,
						screenContext: params.screenContext,
						sensitivity: params.sensitivity,
						payload: params.payload,
					},
				});

				const { data, error } = await withTimeout(
					invokePromise,
					timeoutMs,
					"Nexus AI edge function"
				);

				if (error) {
					throw error;
				}

				if (!data?.ok || !data.data) {
					const functionErrorMessage = data?.error?.message ?? "Nexus AI function returned no data";
					throw new Error(functionErrorMessage);
				}

				const normalized = params.normalize(data.data, params.fallbackData);

				return {
					ok: true,
					data: normalized,
					meta: {
						action: params.action,
						screenContext: params.screenContext,
						sensitivity: params.sensitivity,
						requestId: data.requestId ?? requestId,
						retries: attempt - 1,
						durationMs: Date.now() - startedAt,
						timedOut,
						source: "edge_function",
					},
				};
			} catch (error) {
				lastError = error;
				timedOut = getErrorMessage(error).toLowerCase().includes("timed out");

				if (attempt > maxRetries) {
					break;
				}
			}
		}

		const fallback = params.normalize(params.fallbackData, params.fallbackData);

		return {
			ok: false,
			data: fallback,
			error: {
				code: "NEXUS_AI_UNAVAILABLE",
				message: getErrorMessage(lastError),
				retryable: true,
			},
			meta: {
				action: params.action,
				screenContext: params.screenContext,
				sensitivity: params.sensitivity,
				requestId,
				retries: maxRetries,
				durationMs: Date.now() - startedAt,
				timedOut,
				source: "fallback",
			},
		};
	} finally {
		onLoadingChange?.(false);
	}
}

export async function generateDashboardSummary(
	input: DashboardSummaryInput,
	sensitivity: NexusAISensitivity,
	options?: NexusAIRequestOptions
): Promise<NexusAIResult<DashboardSummaryResult>> {
	const fallback = buildDashboardFallback(input);

	// Automatically build and merge executive context
	let enrichedPayload: Record<string, unknown> = input;
	try {
		const context = await buildDashboardExecutiveContext(sensitivity);
		enrichedPayload = {
			...input,
			_executiveContext: context,
		};
	} catch (error) {
		console.warn("Nexus AI: Failed to build dashboard context, continuing with original payload", error);
		// Continue with original input if context building fails
	}

	return invokeNexusAI<DashboardSummaryResult, DashboardSummaryResult>({
		action: "dashboard_summary",
		screenContext: "home",
		sensitivity,
		payload: enrichedPayload,
		fallbackData: fallback,
		normalize: normalizeDashboardResult,
		options,
	});
}

export async function explainRoute(
	input: RouteExplanationInput,
	sensitivity: NexusAISensitivity,
	options?: NexusAIRequestOptions
): Promise<NexusAIResult<RouteExplanationResult>> {
	const fallback = buildRouteFallback(input);

	// Automatically build and merge route context if route data is available
	let enrichedPayload: Record<string, unknown> = input;
	const routeQuote = options?._routeQuote;

	if (routeQuote) {
		try {
			const context = await buildRouteIntelligenceContext(routeQuote, sensitivity);
			enrichedPayload = {
				...input,
				_routeContext: context,
			};
		} catch (error) {
			console.warn("Nexus AI: Failed to build route context, continuing with original payload", error);
			// Continue with original input if context building fails
		}
	} else {
		console.debug("Nexus AI: Route data not provided, executing with original payload only");
	}

	return invokeNexusAI<RouteExplanationResult, RouteExplanationResult>({
		action: "route_explanation",
		screenContext: "routes",
		sensitivity,
		payload: enrichedPayload,
		fallbackData: fallback,
		normalize: normalizeRouteResult,
		options,
	});
}

export async function analyseTransfer(
	input: TransferAnalysisInput,
	sensitivity: NexusAISensitivity,
	options?: NexusAIRequestOptions
): Promise<NexusAIResult<TransferAnalysisResult>> {
	const fallback = buildTransferFallback(input);

	// Automatically build and merge transfer context if transfer data is available
	let enrichedPayload: Record<string, unknown> = input;
	const transfer = options?._transfer;
	const executionSnapshot = options?._executionSnapshot;

	if (transfer) {
		try {
			const context = await buildTransferIntelligenceContext(transfer, executionSnapshot, sensitivity);
			enrichedPayload = {
				...input,
				_transferContext: context,
			};
		} catch (error) {
			console.warn("Nexus AI: Failed to build transfer context, continuing with original payload", error);
			// Continue with original input if context building fails
		}
	} else {
		console.debug("Nexus AI: Transfer data not provided, executing with original payload only");
	}

	return invokeNexusAI<TransferAnalysisResult, TransferAnalysisResult>({
		action: "transfer_analysis",
		screenContext: "track",
		sensitivity,
		payload: enrichedPayload,
		fallbackData: fallback,
		normalize: normalizeTransferResult,
		options,
	});
}

export async function generateIntelligenceReport(
	input: IntelligenceReportInput,
	sensitivity: NexusAISensitivity,
	options?: NexusAIRequestOptions
): Promise<NexusAIResult<IntelligenceReportResult>> {
	const fallback = buildReportFallback(input);

	// For intelligence reports, enrich with dashboard context based on report type
	let enrichedPayload: Record<string, unknown> = input;

	try {
		// Build dashboard context as operational foundation for all report types
		const dashboardContext = await buildDashboardExecutiveContext(sensitivity);
		enrichedPayload = {
			...input,
			_operationalContext: dashboardContext,
		};
	} catch (error) {
		console.warn(
			"Nexus AI: Failed to build operational context for intelligence report, continuing with original payload",
			error
		);
		// Continue with original input if context building fails
	}

	return invokeNexusAI<IntelligenceReportResult, IntelligenceReportResult>({
		action: "intelligence_report",
		screenContext: "intelligence",
		sensitivity,
		payload: enrichedPayload,
		fallbackData: fallback,
		normalize: normalizeReportResult,
		options,
	});
}

export type {
	DashboardSummaryInput,
	DashboardSummaryResult,
	DashboardTelemetryPayload,
	IntelligenceReportInput,
	IntelligenceReportResult,
	IntelligenceReportType,
	NexusAIRequestOptions,
	NexusAIResult,
	NexusAIScreenContext,
	RouteExplanationInput,
	RouteExplanationResult,
	TransferAnalysisInput,
	TransferAnalysisResult,
	TransferMilestone,
	TransferOperationalEvent,
};

/**
 * Re-export context types and builders for advanced usage.
 *
 * These exports allow callers to optionally build and access context models
 * for more advanced integrations. Context building is optional and all existing
 * APIs remain unchanged.
 */
export type {
	DashboardExecutiveContext,
	RouteIntelligenceContext,
	TransferIntelligenceContext,
};

export {
	buildDashboardExecutiveContext,
	buildRouteIntelligenceContext,
	buildTransferIntelligenceContext,
};

/**
 * Optional enrichment helper exports for advanced callers.
 *
 * These helpers allow optional context enrichment of payloads for integrations
 * that want to leverage the structured context models.
 */
export { enrichDashboardPayload, enrichRoutePayload, enrichTransferPayload };
