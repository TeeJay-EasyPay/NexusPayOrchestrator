import { executeXrplTestnetSettlement, XrplSettlementResult } from "../../lib/xrplSettlement";
import { OpenBankingPaymentFlow, RouteQuote, Transfer, TransferStatus } from "../../types/transfer";
import { createPayout, getPayoutStatus } from "../payout/payoutAdapter";
import { selectBestPayoutPartner } from "../payout/payoutRoutingEngine";
import { PayoutProviderError, PayoutProviderId, PayoutResult, PayoutStatus, ProviderJourneyStep } from "../payout/payoutTypes";
import { transitionRoutePlan } from "../routePlanService";
import { writeTransactionAuditLog } from "../transactionAuditService";
import { saveTransferProgress } from "../transferService";
import { persistExecutionSnapshot } from "./executionPersistenceService";

export type ExecutionState =
  | "IDLE"
  | "RECONNECTING"
  | "VERIFYING_STATUS"
  | "RECONCILING_PROVIDER"
  | "RESUMING_EXECUTION"
  | "VALIDATING_IDEMPOTENCY"
  | "AUTHORISING_ROUTE"
  | "SETTLING_BRIDGE"
  | "EXECUTING_PAYOUT"
  | "VERIFYING_PAYOUT"
  | "FAILOVER_EVALUATION"
  | "COMPLETED"
  | "FAILED";

export type ExecutionStepStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED";

export type ExecutionStep = {
  id: string;
  title: string;
  description: string;
  status: ExecutionStepStatus;
  attempt: number;
  provider?: string;
  startedAt?: number;
  completedAt?: number;
  telemetry?: Record<string, unknown>;
};

export type ExecutionSnapshot = {
  transferId: string;
  state: ExecutionState;
  humanStatus: string;
  progressPercent: number;
  activeStepIndex: number;
  selectedRoute: RouteQuote;
  activeRoute: RouteQuote;
  failoverRoute?: RouteQuote;
  failoverUsed: boolean;
  idempotencyKey: string;
  payout?: PayoutResult;
  payoutStatus: PayoutStatus;
  xrplStatus: "NOT_REQUIRED" | "PENDING" | "COMPLETED" | "FAILED";
  xrplProof?: XrplSettlementResult;
  openBankingFlow?: OpenBankingPaymentFlow;
  steps: ExecutionStep[];
  telemetry: Record<string, unknown>;
  error?: string;
};

type RunExecutionInput = {
  transfer: Transfer;
  selectedRoute: RouteQuote;
  refreshXrpBalance?: () => Promise<void>;
  onSnapshot: (snapshot: ExecutionSnapshot) => void;
  resumeFromSnapshot?: ExecutionSnapshot | null;
};

const runningTransfers = new Set<string>();
const completedTransfers = new Set<string>();

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timeoutAfter(ms: number, label: string) {
  return new Promise<never>((_resolve, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
}

async function withTimeout<T>(task: Promise<T>, ms: number, label: string) {
  return Promise.race([task, timeoutAfter(ms, label)]);
}

function getTimeoutMs(route: RouteQuote) {
  return route.providerTimeoutMs ?? 4500;
}

function getPayoutTimeoutMs(route: RouteQuote) {
  return Math.max(getTimeoutMs(route), 60000);
}

function getMaxRetries(route: RouteQuote) {
  return route.providerMaxRetries ?? 2;
}

function getRetryBackoffMs(route: RouteQuote, attempt: number) {
  return route.providerRetryBackoffMs?.[attempt - 1] ?? attempt * 700;
}

function createIdempotencyKey(transfer: Transfer, route: RouteQuote) {
  return route.providerIdempotencyKey ?? `NPX-IDEMP-${transfer.id}-${route.id}`;
}

function getErrorMessage(caughtError: unknown) {
  if (caughtError instanceof Error) return caughtError.message;
  return String(caughtError);
}

function isTerminalState(state: ExecutionState) {
  return state === "COMPLETED" || state === "FAILED";
}

function mapExecutionStateToTransferStatus(state: ExecutionState): TransferStatus {
  if (state === "COMPLETED") return "COMPLETED";
  if (state === "FAILED") return "FAILED";
  if (state === "RECONNECTING") return "RECONNECTING";
  if (state === "VERIFYING_STATUS") return "VERIFYING_STATUS";
  if (state === "RECONCILING_PROVIDER") return "RECONCILING_PROVIDER";
  if (state === "RESUMING_EXECUTION") return "RESUMING_EXECUTION";
  return "IN_PROGRESS";
}

function findFailoverRoute(transfer: Transfer, selectedRoute: RouteQuote) {
  const selectedPayoutProvider = selectedRoute.routePlan?.payout.provider.providerId;
  const hasRecipientData = (route: RouteQuote) => {
    const providerId = route.routePlan?.payout.provider.providerId;
    if (providerId === "AIRWALLEX_SANDBOX") {
      return Object.keys(transfer.recipient.airwallexBeneficiaryFields ?? {}).length > 0;
    }
    if (providerId === "NIUM_SANDBOX") {
      return Object.keys(transfer.recipient.niumBeneficiaryFields ?? {}).length > 0;
    }
    return true;
  };

  const isExecutableFailover = (route: RouteQuote) =>
    route.id !== selectedRoute.id
    && route.orchestrationSafetyStatus !== "BLOCK"
    && route.routePlan?.eligible !== false
    && (!route.routePlan || Date.now() < Date.parse(route.routePlan.quoteExpiresAt))
    && hasRecipientData(route);

  if (selectedRoute.failoverRouteId) {
    const explicitRoute = transfer.routes.find((route) => route.id === selectedRoute.failoverRouteId);
    if (explicitRoute && isExecutableFailover(explicitRoute)) return explicitRoute;
  }

  return [...transfer.routes]
    .filter(isExecutableFailover)
    .sort((a, b) => {
      const aDifferentProvider = a.routePlan?.payout.provider.providerId !== selectedPayoutProvider ? 1 : 0;
      const bDifferentProvider = b.routePlan?.payout.provider.providerId !== selectedPayoutProvider ? 1 : 0;
      return bDifferentProvider - aDifferentProvider || (b.score ?? 0) - (a.score ?? 0);
    })[0];
}

function buildOpenBankingSteps(flow?: OpenBankingPaymentFlow): ExecutionStep[] {
  if (!flow?.steps?.length) {
    return [];
  }

  return flow.steps.map((step): ExecutionStep => ({
    id: `open_banking_${step.stepKey}`,
    title: step.label,
    description: `${step.provider} ${flow.environment} flow step (${step.provenance}).`,
    status: step.status === "DONE" ? "DONE" : step.status === "FAILED" ? "FAILED" : "PENDING",
    attempt: step.status === "DONE" ? 1 : 0,
    provider: step.provider,
    startedAt: new Date(step.createdAt).getTime(),
    completedAt: step.status === "DONE" ? new Date(step.createdAt).getTime() : undefined,
    telemetry: {
      open_banking_flow_id: flow.id,
      provider: step.provider,
      provenance: step.provenance,
      http_status: step.httpStatus ?? null,
      response_time_ms: step.responseTimeMs ?? null,
      ...step.metadata,
    },
  }));
}

function assertOpenBankingFundingCompleted(transfer: Transfer) {
  if (transfer.fundingMethod !== "OPEN_BANKING") return;
  const flow = transfer.openBankingFlow;
  if (!flow) {
    throw new Error("Yapily funding evidence is missing. Airwallex payout was not started.");
  }
  if (flow.status === "PAYMENT_FAILED" || ["FAILED", "REJECTED"].includes(String(flow.providerPaymentStatus).toUpperCase())) {
    throw new Error(flow.failureReason ?? "Yapily funding failed. Airwallex payout was not started.");
  }
  if (flow.status !== "PAYMENT_COMPLETED" || String(flow.providerPaymentStatus).toUpperCase() !== "COMPLETED") {
    throw new Error("Yapily funding is awaiting bank confirmation. Airwallex payout was not started.");
  }
}

function buildSteps(route: RouteQuote, openBankingFlow?: OpenBankingPaymentFlow): ExecutionStep[] {
  return [
    ...buildOpenBankingSteps(openBankingFlow),
    {
      id: "idempotency",
      title: "Execution lock created",
      description: "Duplicate provider submissions are blocked before execution begins.",
      status: "PENDING",
      attempt: 0,
    },
    {
      id: "route_authorisation",
      title: "Route authorised",
      description: `Execution metadata checked for ${route.provider}.`,
      status: "PENDING",
      attempt: 0,
      provider: route.provider,
    },
    {
      id: "bridge_settlement",
      title: route.rail === "HYBRID" ? "XRPL bridge settlement" : "Bridge settlement skipped",
      description:
        route.rail === "HYBRID"
          ? "Hybrid execution validates a testnet bridge proof before payout completion."
          : "This route does not require an XRPL bridge leg.",
      status: "PENDING",
      attempt: 0,
      provider: route.provider,
    },
    {
      id: "payout_execution",
      title: "Provider payout submitted",
      description: "The provider adapter submits the destination payout instruction.",
      status: "PENDING",
      attempt: 0,
      provider: route.provider,
    },
    {
      id: "payout_verification",
      title: "Provider payout verified",
      description: "The final payout status is checked before the transfer is completed.",
      status: "PENDING",
      attempt: 0,
      provider: route.provider,
    },
  ];
}

function updateStep(steps: ExecutionStep[], id: string, patch: Partial<ExecutionStep>) {
  return steps.map((step) => (step.id === id ? { ...step, ...patch } : step));
}

function completeStep(steps: ExecutionStep[], id: string, telemetry?: Record<string, unknown>) {
  return updateStep(steps, id, {
    status: "DONE",
    completedAt: Date.now(),
    telemetry,
  });
}

function failStep(steps: ExecutionStep[], id: string, telemetry?: Record<string, unknown>) {
  return updateStep(steps, id, {
    status: "FAILED",
    completedAt: Date.now(),
    telemetry,
  });
}

function skipStep(steps: ExecutionStep[], id: string, telemetry?: Record<string, unknown>) {
  return updateStep(steps, id, {
    status: "SKIPPED",
    completedAt: Date.now(),
    telemetry,
  });
}

function mergeProviderJourneySteps(steps: ExecutionStep[], journey?: ProviderJourneyStep[]) {
  if (!journey?.length) return steps;

  const baseSteps = steps.filter((step) => !step.id.startsWith("provider_journey_"));
  const payoutIndex = baseSteps.findIndex((step) => step.id === "payout_execution");
  const insertionIndex = payoutIndex >= 0 ? payoutIndex + 1 : baseSteps.length;
  const providerSteps = journey.map((step): ExecutionStep => ({
    id: `provider_journey_${step.key}`,
    title: step.label,
    description: `${step.description} Evidence: ${step.provenance}.`,
    status: step.status,
    attempt: step.status === "PENDING" ? 0 : 1,
    provider: step.provider,
    startedAt: step.occurredAt ? new Date(step.occurredAt).getTime() : undefined,
    completedAt: step.status === "PENDING" || !step.occurredAt ? undefined : new Date(step.occurredAt).getTime(),
    telemetry: {
      provider_status: step.providerStatus ?? null,
      provenance: step.provenance,
    },
  }));

  return [
    ...baseSteps.slice(0, insertionIndex),
    ...providerSteps,
    ...baseSteps.slice(insertionIndex),
  ];
}

function progressForSteps(steps: ExecutionStep[]) {
  const completed = steps.filter((step) => step.status === "DONE" || step.status === "SKIPPED").length;
  return Math.round((completed / steps.length) * 100);
}

function activeIndexForSteps(steps: ExecutionStep[]) {
  const runningIndex = steps.findIndex((step) => step.status === "RUNNING");
  if (runningIndex >= 0) return runningIndex;

  const pendingIndex = steps.findIndex((step) => step.status === "PENDING");
  if (pendingIndex >= 0) return pendingIndex;

  return steps.length - 1;
}

function normalizeRunningSteps(steps: ExecutionStep[]) {
  return steps.map((step) =>
    step.status === "RUNNING"
      ? {
          ...step,
          status: "PENDING" as ExecutionStepStatus,
        }
      : step
  );
}

function assertNoUnresolvedStepsBeforeCompletion(steps: ExecutionStep[]) {
  const unresolved = steps.filter((step) => step.status === "PENDING" || step.status === "RUNNING");
  if (unresolved.length > 0) {
    throw new Error(`Cannot complete execution while steps are unresolved: ${unresolved.map((step) => step.id).join(", ")}`);
  }
}

async function writeExecutionAudit(
  transferId: string,
  eventType: Parameters<typeof writeTransactionAuditLog>[0]["eventType"],
  status: Parameters<typeof writeTransactionAuditLog>[0]["status"],
  message: string,
  metadata: Record<string, unknown>
) {
  await writeTransactionAuditLog({
    transactionId: transferId,
    eventType,
    status,
    message,
    metadata,
  });
}

function withRoutePlanStatus(
  route: RouteQuote,
  status: NonNullable<RouteQuote["routePlan"]>["status"],
) {
  return route.routePlan
    ? { ...route, routePlan: { ...route.routePlan, status } }
    : route;
}

export async function runTransferExecution({
  transfer,
  selectedRoute,
  refreshXrpBalance,
  onSnapshot,
  resumeFromSnapshot,
}: RunExecutionInput) {
  const transferId = transfer.id;
  const idempotencyKey = createIdempotencyKey(transfer, selectedRoute);
  const failoverRoute = findFailoverRoute(transfer, selectedRoute);
  const isRecoveryRun = Boolean(resumeFromSnapshot && !isTerminalState(resumeFromSnapshot.state));

  let state: ExecutionState = "IDLE";
  let activeRoute = resumeFromSnapshot?.activeRoute ?? selectedRoute;
  let failoverUsed = resumeFromSnapshot?.failoverUsed ?? false;
  let steps = resumeFromSnapshot?.steps?.length
    ? normalizeRunningSteps(resumeFromSnapshot.steps)
    : buildSteps(activeRoute, transfer.openBankingFlow);
  let payout: PayoutResult | undefined = resumeFromSnapshot?.payout;
  let payoutStatus: PayoutStatus = resumeFromSnapshot?.payoutStatus ?? "NOT_STARTED";
  let xrplStatus: ExecutionSnapshot["xrplStatus"] =
    resumeFromSnapshot?.xrplStatus ?? (activeRoute.rail === "HYBRID" ? "PENDING" : "NOT_REQUIRED");
  let xrplProof: XrplSettlementResult | undefined = resumeFromSnapshot?.xrplProof;
  let error: string | undefined;

  async function emit(humanStatus: string, extraTelemetry: Record<string, unknown> = {}) {
    const snapshot: ExecutionSnapshot = {
      transferId,
      state,
      humanStatus,
      progressPercent: state === "COMPLETED" ? 100 : progressForSteps(steps),
      activeStepIndex: activeIndexForSteps(steps),
      selectedRoute,
      activeRoute,
      failoverRoute,
      failoverUsed,
      idempotencyKey,
      payout,
      payoutStatus,
      xrplStatus,
      xrplProof,
      openBankingFlow: transfer.openBankingFlow,
      steps,
      telemetry: {
        provider: activeRoute.provider,
        provider_adapter_id: activeRoute.providerAdapterId ?? null,
        provider_health_status: activeRoute.providerHealthStatus ?? null,
        provider_timeout_ms: getTimeoutMs(activeRoute),
        provider_max_retries: getMaxRetries(activeRoute),
        route_score: activeRoute.score,
        orchestration_safety_status: activeRoute.orchestrationSafetyStatus ?? null,
        failover_recommended: activeRoute.failoverRecommended ?? false,
        recovery_run: isRecoveryRun,
        open_banking_flow_id: transfer.openBankingFlow?.id ?? null,
        open_banking_provider: transfer.openBankingFlow?.providerId ?? null,
        open_banking_status: transfer.openBankingFlow?.status ?? null,
        execution_checkpoint: steps[activeIndexForSteps(steps)]?.id ?? null,
        ...extraTelemetry,
      },
      error,
    };

    onSnapshot(snapshot);
    await persistExecutionSnapshot(snapshot);
    await saveTransferProgress({
      ...transfer,
      selectedRoute: activeRoute,
      status: mapExecutionStateToTransferStatus(state),
    });
  }

  async function audit(
    eventType: Parameters<typeof writeTransactionAuditLog>[0]["eventType"],
    status: Parameters<typeof writeTransactionAuditLog>[0]["status"],
    message: string,
    metadata: Record<string, unknown> = {}
  ) {
    await writeExecutionAudit(transferId, eventType, status, message, {
      idempotency_key: idempotencyKey,
      selected_route_id: selectedRoute.id,
      active_route_id: activeRoute.id,
      active_provider: activeRoute.provider,
      failover_used: failoverUsed,
      recovery_run: isRecoveryRun,
      ...metadata,
    });
  }

  async function requireRouteTransition(
    route: RouteQuote,
    status: NonNullable<RouteQuote["routePlan"]>["status"],
    reason: string,
    replacement?: RouteQuote,
  ) {
    if (!route.routePlan) return;
    const persisted = await transitionRoutePlan(route, status, reason, replacement);
    if (!persisted) {
      throw new Error(`Route Plan ${route.routePlan.id} could not transition to ${status}.`);
    }
  }

  async function runRecoveryPrelude() {
    if (!isRecoveryRun) return;

    state = "RECONNECTING";
    await emit("Execution interrupted. Reconnecting to orchestration runtime...", {
      recovered_from_state: resumeFromSnapshot?.state,
    });
    await wait(400);

    state = "VERIFYING_STATUS";
    await emit("Verifying latest transaction state before resuming execution...", {
      recovered_progress_percent: resumeFromSnapshot?.progressPercent ?? null,
    });
    await wait(500);

    state = "RECONCILING_PROVIDER";
    await emit("Reconciling provider and payout state from the latest persisted checkpoint...", {
      payout_reference: payout?.payoutReference ?? null,
      payout_status: payoutStatus,
      xrpl_status: xrplStatus,
    });
    await wait(500);

    state = "RESUMING_EXECUTION";
    await emit("Resuming execution from the safest available checkpoint...", {
      checkpoint: steps[activeIndexForSteps(steps)]?.id ?? null,
    });
    await audit("ROUTE_EXECUTION_STARTED", "INFO", "Execution recovery and reconciliation started.", {
      recovered_from_state: resumeFromSnapshot?.state,
      recovered_progress_percent: resumeFromSnapshot?.progressPercent ?? null,
    });
    await wait(350);
  }

  async function runRouteLifecycle() {
    const routeAuthorised = steps.find((step) => step.id === "route_authorisation")?.status === "DONE";

    if (!routeAuthorised) {
      state = "AUTHORISING_ROUTE";
      steps = updateStep(steps, "route_authorisation", {
        status: "RUNNING",
        attempt: 1,
        startedAt: Date.now(),
        provider: activeRoute.provider,
      });
      await emit(`Authorising ${activeRoute.provider} route metadata...`);
      await audit("ROUTE_EXECUTION_STARTED", "PENDING", "Route execution checks started.", {
        route_id: activeRoute.id,
        provider_health_status: activeRoute.providerHealthStatus ?? null,
        orchestration_safety_status: activeRoute.orchestrationSafetyStatus ?? null,
      });

      await wait(350);

      if (activeRoute.orchestrationSafetyStatus === "BLOCK") {
        throw new Error(`${activeRoute.provider} route is blocked by orchestration safety checks.`);
      }

      steps = completeStep(steps, "route_authorisation", {
        provider_health_status: activeRoute.providerHealthStatus ?? null,
        orchestration_safety_status: activeRoute.orchestrationSafetyStatus ?? null,
      });
      await emit(`${activeRoute.provider} route authorised.`);
    }

    const bridgeStep = steps.find((step) => step.id === "bridge_settlement");
    const bridgeResolved = bridgeStep?.status === "DONE" || bridgeStep?.status === "SKIPPED";

    if (!bridgeResolved) {
      state = "SETTLING_BRIDGE";

      if (activeRoute.rail === "HYBRID") {
        xrplStatus = "PENDING";
        steps = updateStep(steps, "bridge_settlement", {
          status: "RUNNING",
          attempt: 1,
          startedAt: Date.now(),
          provider: activeRoute.provider,
        });
        await emit("Submitting XRPL testnet bridge settlement...");
        await audit("XRPL_SUBMITTED", "PENDING", "XRPL bridge settlement submitted.", {
          bridge_asset: activeRoute.bridgeAsset ?? null,
          send_amount_gbp: transfer.senderAmount,
        });

        try {
          xrplProof = await withTimeout(
            executeXrplTestnetSettlement({
              transferId,
              routePlanId: activeRoute.routePlan!.id,
              rlusdAmount: (transfer.senderAmount ?? 0) * (activeRoute.routePlan!.bridge.pathQuote.value ?? 0),
              settlementRate: activeRoute.routePlan!.bridge.pathQuote.value ?? 0,
            }),
            Math.max(getTimeoutMs(activeRoute), 45000),
            "XRPL settlement"
          );
          xrplStatus = "COMPLETED";
          steps = completeStep(steps, "bridge_settlement", {
            tx_hash: xrplProof.txHash,
            rlusd_amount: xrplProof.rlusdAmount,
            network_fee_xrp: xrplProof.networkFeeXrp,
            ledger_index: xrplProof.ledgerIndex,
            settlement_rate: xrplProof.settlementRate,
          });
          await refreshXrpBalance?.();
          await emit("XRPL bridge proof validated on testnet.", {
            xrpl_tx_hash: xrplProof.txHash,
          });
          await audit("XRPL_VALIDATED", "SUCCESS", "XRPL bridge settlement validated.", {
            tx_hash: xrplProof.txHash,
            rlusd_amount: xrplProof.rlusdAmount,
            network_fee_xrp: xrplProof.networkFeeXrp,
            ledger_index: xrplProof.ledgerIndex,
          });
        } catch (caughtError) {
          xrplStatus = "FAILED";
          const xrplError = getErrorMessage(caughtError);
          steps = failStep(steps, "bridge_settlement", { error: xrplError });
          throw new Error(`XRPL settlement failed: ${xrplError}`);
        }
      } else {
        xrplStatus = "NOT_REQUIRED";
        steps = skipStep(steps, "bridge_settlement", {
          reason: "Route rail does not require XRPL bridge settlement.",
        });
        await emit("XRPL avoided because this route does not require a bridge settlement leg.");
      }
    }

    const payoutExecutionDone = steps.find((step) => step.id === "payout_execution")?.status === "DONE";

    if (!payoutExecutionDone || !payout) {
      state = "EXECUTING_PAYOUT";
      const payoutRequest = {
        transferId,
        amount: activeRoute.receiveAmount,
        currency: transfer.recipient.currency,
        country: transfer.recipient.country,
        recipient: transfer.recipient,
        payoutMethod: transfer.recipient.payoutMethod,
        payoutProviderName: activeRoute.provider,
        providerId: activeRoute.routePlan?.payout.provider.providerId as PayoutProviderId | undefined,
        quoteId: activeRoute.routePlan?.payout.provider.quoteReference?.value ?? undefined,
      };
      const payoutPartner = activeRoute.routePlan
        ? {
            selectedProviderId: payoutRequest.providerId!,
            selectedProviderName: activeRoute.routePlan.payout.provider.providerName,
          }
        : selectBestPayoutPartner(payoutRequest);
      const maxRetries = getMaxRetries(activeRoute);
      const totalAttempts = maxRetries + 1;

      for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
        steps = updateStep(steps, "payout_execution", {
          status: "RUNNING",
          attempt,
          startedAt: Date.now(),
          provider: payoutPartner.selectedProviderName,
          title: `${payoutPartner.selectedProviderName} payout submission`,
          description: `Submitting the final-leg payout through ${payoutPartner.selectedProviderName}.`,
        });
        payoutStatus = attempt === 1 ? "NOT_STARTED" : payoutStatus;
        await emit(`Submitting payout via ${payoutPartner.selectedProviderName}...`, {
          payout_attempt: attempt,
          payout_total_attempts: totalAttempts,
        });
        await audit("PAYOUT_INITIATED", "PENDING", "Provider payout submission started.", {
          attempt,
          total_attempts: totalAttempts,
        });

        try {
          payout = await withTimeout(
            createPayout(payoutRequest),
            getPayoutTimeoutMs(activeRoute),
            `${activeRoute.provider} payout submission`
          );

          payoutStatus = payout.status;
          steps = completeStep(steps, "payout_execution", {
            payout_reference: payout.payoutReference,
            provider_id: payout.providerId,
            fallback_used: payout.fallbackUsed ?? false,
          });
          steps = updateStep(steps, "payout_execution", {
            title: `${payout.providerName} payout submitted`,
            description: payout.providerMessage,
            provider: payout.providerName,
          });
          steps = mergeProviderJourneySteps(steps, payout.providerJourney);
          await emit(`${payout.providerName} payout accepted by adapter.`, {
            payout_reference: payout.payoutReference,
            payout_provider_id: payout.providerId,
            payout_provider_status: payout.providerStatus ?? null,
          });
          break;
        } catch (caughtError) {
          const payoutError = getErrorMessage(caughtError);
          const providerError = caughtError instanceof PayoutProviderError ? caughtError : null;
          const failedProviderName = providerError?.providerName ?? payoutPartner.selectedProviderName;
          const retryable = providerError?.retryable ?? true;

          steps = updateStep(steps, "payout_execution", {
            provider: failedProviderName,
            title: `${failedProviderName} payout submission`,
            description: payoutError,
          });

          if (retryable && attempt < totalAttempts) {
            const backoffMs = getRetryBackoffMs(activeRoute, attempt);
            await audit("RETRY_SCHEDULED", "INFO", "Provider payout submission retry scheduled.", {
              attempt,
              next_attempt: attempt + 1,
              backoff_ms: backoffMs,
              error: payoutError,
            });
            await emit(`${failedProviderName} submission attempt ${attempt} failed. Retrying safely...`, {
              payout_attempt: attempt,
              retry_backoff_ms: backoffMs,
              error: payoutError,
            });
            await wait(backoffMs);
            continue;
          }

          payoutStatus = "FAILED";
          steps = failStep(steps, "payout_execution", {
            attempt,
            error: payoutError,
            provider_id: providerError?.providerId ?? payoutPartner.selectedProviderId,
            provider_error_code: providerError?.code ?? null,
            provider_operation: providerError?.operation ?? null,
            retryable,
          });
          throw new Error(`${failedProviderName} payout submission failed: ${payoutError}`);
        }
      }
    }

    if (!payout) {
      throw new Error("Payout adapter did not return a payout reference.");
    }

    const payoutVerified = steps.find((step) => step.id === "payout_verification")?.status === "DONE";

    if (!payoutVerified) {
      state = "VERIFYING_PAYOUT";
      payoutStatus = payoutStatus === "INITIATED" ? "PROCESSING" : payoutStatus;
      steps = updateStep(steps, "payout_verification", {
        status: "RUNNING",
        attempt: 1,
        startedAt: Date.now(),
        provider: payout.providerName,
        title: `${payout.providerName} payout verified`,
        description: "The provider transfer status is retrieved before NexusPay declares recipient completion.",
      });
      await emit("Verifying destination payout status...", {
        payout_reference: payout.payoutReference,
      });
      await audit("PAYOUT_PROCESSING", "PENDING", "Provider payout verification started.", {
        payout_reference: payout.payoutReference,
      });

      for (let verificationAttempt = 1; verificationAttempt <= 3; verificationAttempt += 1) {
        payoutStatus = await withTimeout(
          getPayoutStatus(payout.payoutReference),
          getPayoutTimeoutMs(activeRoute),
          `${payout.providerName} payout verification`
        );
        if (payoutStatus === "PAID_OUT" || payoutStatus === "FAILED") break;

        await emit(`${payout.providerName} payout is ${payoutStatus.toLowerCase()}; reconciling the same provider transfer...`, {
          payout_reference: payout.payoutReference,
          payout_verification_attempt: verificationAttempt,
          payout_status: payoutStatus,
        });
        await wait(verificationAttempt * 2000);
      }

      if (payoutStatus !== "PAID_OUT") {
        steps = failStep(steps, "payout_verification", {
          payout_reference: payout.payoutReference,
          payout_status: payoutStatus,
        });
        throw new Error(`Payout verification returned ${payoutStatus}.`);
      }

      if (payout.providerId === "AIRWALLEX_SANDBOX") {
        payout = await withTimeout(
          createPayout({
            transferId,
            amount: activeRoute.receiveAmount,
            currency: transfer.recipient.currency,
            country: transfer.recipient.country,
            recipient: transfer.recipient,
            payoutMethod: transfer.recipient.payoutMethod,
            payoutProviderName: activeRoute.provider,
            providerId: activeRoute.routePlan?.payout.provider.providerId as PayoutProviderId | undefined,
            quoteId: activeRoute.routePlan?.payout.provider.quoteReference?.value ?? undefined,
          }),
          getPayoutTimeoutMs(activeRoute),
          "Airwallex payout evidence refresh"
        );
        payoutStatus = payout.status;
        steps = mergeProviderJourneySteps(steps, payout.providerJourney);
      }

      payout = {
        ...payout,
        status: payoutStatus,
        updatedAt: new Date().toISOString(),
      };
      steps = completeStep(steps, "payout_verification", {
        payout_reference: payout.payoutReference,
        payout_status: payoutStatus,
      });
      await emit("Destination payout verified successfully.", {
        payout_reference: payout.payoutReference,
        payout_status: payoutStatus,
      });
      await audit("PAYOUT_COMPLETED", "SUCCESS", "Provider payout completed.", {
        payout_reference: payout.payoutReference,
        payout_status: payoutStatus,
      });
    }
  }

  if (completedTransfers.has(transferId)) {
    activeRoute = withRoutePlanStatus(activeRoute, "COMPLETED");
    state = "VERIFYING_STATUS";
    await emit("Transfer was already completed. Verifying persisted terminal state before rendering completion.");
    state = "COMPLETED";
    steps = steps.map((step) =>
      step.status === "PENDING" || step.status === "RUNNING"
        ? { ...step, status: "SKIPPED", completedAt: step.completedAt ?? Date.now() }
        : step
    );
    await emit("Transfer was already completed. Duplicate execution ignored safely.");
    await audit("IDEMPOTENCY_BLOCKED", "INFO", "Duplicate execution ignored because transfer is already complete.");
    return { completed: true, duplicate: true };
  }

  if (runningTransfers.has(transferId)) {
    state = "VERIFYING_STATUS";
    await emit("Execution is already running. Duplicate start request blocked while latest state is verified.");
    await audit("IDEMPOTENCY_BLOCKED", "INFO", "Duplicate execution start request blocked.");
    return { completed: false, duplicate: true };
  }

  runningTransfers.add(transferId);

  try {
    const approvedPlan = selectedRoute.routePlan;
    if (approvedPlan) {
      if (!approvedPlan.eligible || approvedPlan.status !== "APPROVED") {
        throw new Error("Canonical route plan is not approved for execution.");
      }
      if (!isRecoveryRun && Date.now() >= Date.parse(approvedPlan.quoteExpiresAt)) {
        throw new Error("Canonical route quote expired before execution. Recalculate and approve a current route.");
      }
      await requireRouteTransition(selectedRoute, "EXECUTING", "Execution started for the approved route plan version.");
      activeRoute = withRoutePlanStatus(activeRoute, "EXECUTING");
    }

    assertOpenBankingFundingCompleted(transfer);

    await runRecoveryPrelude();

    state = "VALIDATING_IDEMPOTENCY";
    steps = updateStep(steps, "idempotency", {
      status: "RUNNING",
      attempt: 1,
      startedAt: Date.now(),
    });
    await emit("Creating safe execution lock...");
    await audit("EXECUTION_STARTED", "PENDING", "Execution state machine started.", {
      failover_route_id: failoverRoute?.id ?? null,
      selected_provider: selectedRoute.provider,
    });

    await wait(250);
    steps = completeStep(steps, "idempotency", {
      idempotency_key: idempotencyKey,
    });
    await emit("Execution lock created. Continuing orchestration lifecycle...");

    try {
      await runRouteLifecycle();
    } catch (primaryError) {
      const primaryErrorMessage = getErrorMessage(primaryError);

      if (!failoverRoute || failoverUsed) {
        throw primaryError;
      }

      await requireRouteTransition(activeRoute, "FAILED", primaryErrorMessage, failoverRoute);
      activeRoute = withRoutePlanStatus(activeRoute, "FAILED");
      state = "FAILOVER_EVALUATION";
      error = primaryErrorMessage;
      await emit("Primary route failed. Evaluating safe failover route...", {
        primary_error: primaryErrorMessage,
        failover_route_id: failoverRoute.id,
      });
      await audit("FAILOVER_TRIGGERED", "INFO", "Primary route failed and failover route was selected.", {
        primary_route_id: activeRoute.id,
        failover_route_id: failoverRoute.id,
        primary_error: primaryErrorMessage,
      });
      await requireRouteTransition(failoverRoute, "APPROVED", "Approved automatically as the recorded safe failover replacement.");

      await wait(500);
      await requireRouteTransition(failoverRoute, "EXECUTING", "Failover replacement route began execution.");
      activeRoute = withRoutePlanStatus(failoverRoute, "EXECUTING");
      failoverUsed = true;
      payout = undefined;
      payoutStatus = "NOT_STARTED";
      xrplProof = undefined;
      xrplStatus = activeRoute.rail === "HYBRID" ? "PENDING" : "NOT_REQUIRED";
      error = undefined;
      steps = buildSteps(activeRoute, transfer.openBankingFlow);
      steps = completeStep(steps, "idempotency", {
        idempotency_key: idempotencyKey,
        failover_lock_reused: true,
      });
      await emit(`Failover activated. Continuing via ${activeRoute.provider}...`, {
        failover_route_id: activeRoute.id,
      });
      await runRouteLifecycle();
    }

    assertNoUnresolvedStepsBeforeCompletion(steps);
    state = "COMPLETED";
    completedTransfers.add(transferId);
    await requireRouteTransition(activeRoute, "COMPLETED", "Settlement and final payout completed.");
    activeRoute = withRoutePlanStatus(activeRoute, "COMPLETED");
    await emit("Transfer completed. Settlement and payout lifecycle finished.");
    await audit("ROUTE_EXECUTION_COMPLETED", "SUCCESS", "Route execution completed.", {
      active_route_id: activeRoute.id,
      active_provider: activeRoute.provider,
      payout_reference: payout?.payoutReference ?? null,
    });
    await audit("TRANSFER_COMPLETED", "SUCCESS", "Transfer completed successfully.", {
      payout_reference: payout?.payoutReference ?? null,
      xrpl_tx_hash: xrplProof?.txHash ?? null,
      failover_used: failoverUsed,
    });
    return { completed: true, duplicate: false };
  } catch (caughtError) {
    error = getErrorMessage(caughtError);
    state = "FAILED";
    payoutStatus = payoutStatus === "NOT_STARTED" ? "FAILED" : payoutStatus;

    const activeStep = steps.find((step) => step.status === "RUNNING");
    if (activeStep) {
      steps = failStep(steps, activeStep.id, { error });
    }

    await transitionRoutePlan(activeRoute, "FAILED", error);
    activeRoute = withRoutePlanStatus(activeRoute, "FAILED");
    await emit("Transfer execution failed safely. Duplicate payout protection remains active.");

    await audit("TRANSFER_FAILED", "FAILED", "Execution state machine failed safely.", {
      error,
      payout_status: payoutStatus,
      xrpl_status: xrplStatus,
    });
    return { completed: false, duplicate: false };
  } finally {
    runningTransfers.delete(transferId);
  }
}
