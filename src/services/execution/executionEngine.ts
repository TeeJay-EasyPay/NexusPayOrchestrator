import { executeXrplTestnetSettlement, XrplSettlementResult } from "../../lib/xrplSettlement";
import { RouteQuote, Transfer } from "../../types/transfer";
import { createPayout, getPayoutStatus } from "../payout/payoutAdapter";
import { PayoutResult, PayoutStatus } from "../payout/payoutTypes";
import { writeTransactionAuditLog } from "../transactionAuditService";

export type ExecutionState =
  | "IDLE"
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
  steps: ExecutionStep[];
  telemetry: Record<string, unknown>;
  error?: string;
};

type RunExecutionInput = {
  transfer: Transfer;
  selectedRoute: RouteQuote;
  refreshXrpBalance?: () => Promise<void>;
  onSnapshot: (snapshot: ExecutionSnapshot) => void;
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

function getMaxRetries(route: RouteQuote) {
  return route.providerMaxRetries ?? 2;
}

function getRetryBackoffMs(route: RouteQuote, attempt: number) {
  return route.providerRetryBackoffMs?.[attempt - 1] ?? attempt * 700;
}

function createIdempotencyKey(transfer: Transfer, route: RouteQuote) {
  return route.providerIdempotencyKey ?? `NPX-IDEMP-${transfer.id}-${route.id}`;
}

function findFailoverRoute(transfer: Transfer, selectedRoute: RouteQuote) {
  if (selectedRoute.failoverRouteId) {
    const explicitRoute = transfer.routes.find((route) => route.id === selectedRoute.failoverRouteId);
    if (explicitRoute) return explicitRoute;
  }

  return [...transfer.routes]
    .filter((route) => route.id !== selectedRoute.id)
    .filter((route) => route.orchestrationSafetyStatus !== "BLOCK")
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
}

function buildSteps(route: RouteQuote): ExecutionStep[] {
  return [
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

export async function runTransferExecution({
  transfer,
  selectedRoute,
  refreshXrpBalance,
  onSnapshot,
}: RunExecutionInput) {
  const transferId = transfer.id;
  const idempotencyKey = createIdempotencyKey(transfer, selectedRoute);
  const failoverRoute = findFailoverRoute(transfer, selectedRoute);

  let state: ExecutionState = "IDLE";
  let activeRoute = selectedRoute;
  let failoverUsed = false;
  let steps = buildSteps(activeRoute);
  let payout: PayoutResult | undefined;
  let payoutStatus: PayoutStatus = "NOT_STARTED";
  let xrplStatus: ExecutionSnapshot["xrplStatus"] = activeRoute.rail === "HYBRID" ? "PENDING" : "NOT_REQUIRED";
  let xrplProof: XrplSettlementResult | undefined;
  let error: string | undefined;

  function emit(humanStatus: string, extraTelemetry: Record<string, unknown> = {}) {
    onSnapshot({
      transferId,
      state,
      humanStatus,
      progressPercent: progressForSteps(steps),
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
        ...extraTelemetry,
      },
      error,
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
      ...metadata,
    });
  }

  if (completedTransfers.has(transferId)) {
    state = "COMPLETED";
    steps = steps.map((step) => ({ ...step, status: "DONE" }));
    emit("Transfer was already completed. Duplicate execution ignored safely.");
    await audit("IDEMPOTENCY_BLOCKED", "INFO", "Duplicate execution ignored because transfer is already complete.");
    return { completed: true, duplicate: true };
  }

  if (runningTransfers.has(transferId)) {
    state = "VALIDATING_IDEMPOTENCY";
    emit("Execution is already running. Duplicate start request blocked.");
    await audit("IDEMPOTENCY_BLOCKED", "INFO", "Duplicate execution start request blocked.");
    return { completed: false, duplicate: true };
  }

  runningTransfers.add(transferId);

  try {
    state = "VALIDATING_IDEMPOTENCY";
    steps = updateStep(steps, "idempotency", {
      status: "RUNNING",
      attempt: 1,
      startedAt: Date.now(),
    });
    emit("Creating safe execution lock...");
    await audit("EXECUTION_STARTED", "PENDING", "Execution state machine started.", {
      failover_route_id: failoverRoute?.id ?? null,
      selected_provider: selectedRoute.provider,
    });
    await wait(350);
    steps = updateStep(steps, "idempotency", {
      status: "DONE",
      completedAt: Date.now(),
    });

    state = "AUTHORISING_ROUTE";
    steps = updateStep(steps, "route_authorisation", {
      status: "RUNNING",
      attempt: 1,
      startedAt: Date.now(),
    });
    emit("Checking route safety, provider health and execution metadata...");
    await audit("ROUTE_EXECUTION_STARTED", "PENDING", "Selected route entered execution lifecycle.", {
      rail: activeRoute.rail,
      provider_health_status: activeRoute.providerHealthStatus ?? null,
      orchestration_safety_status: activeRoute.orchestrationSafetyStatus ?? null,
      timeout_ms: getTimeoutMs(activeRoute),
      max_retries: getMaxRetries(activeRoute),
    });

    if (activeRoute.orchestrationSafetyStatus === "BLOCK") {
      throw new Error(activeRoute.orchestrationSafetyReason ?? "Route blocked by safety layer.");
    }

    await wait(500);
    steps = updateStep(steps, "route_authorisation", {
      status: "DONE",
      completedAt: Date.now(),
    });

    if (activeRoute.rail === "HYBRID") {
      state = "SETTLING_BRIDGE";
      xrplStatus = "PENDING";
      steps = updateStep(steps, "bridge_settlement", {
        status: "RUNNING",
        attempt: 1,
        startedAt: Date.now(),
      });
      emit("Submitting XRPL bridge settlement proof...");
      await audit("XRPL_SUBMITTED", "PENDING", "XRPL bridge settlement submitted.", {
        bridge_asset: activeRoute.bridgeAsset ?? null,
        liquidity_required_rlusd: activeRoute.liquidityRequiredRlusd ?? null,
      });

      xrplProof = await withTimeout(
        executeXrplTestnetSettlement({ gbpAmount: transfer.senderAmount ?? 0 }),
        getTimeoutMs(activeRoute),
        "XRPL settlement"
      );
      xrplStatus = "COMPLETED";
      steps = updateStep(steps, "bridge_settlement", {
        status: "DONE",
        completedAt: Date.now(),
        telemetry: {
          tx_hash: xrplProof.txHash,
          xrp_amount: xrplProof.xrpAmount,
        },
      });
      await refreshXrpBalance?.();
      await audit("XRPL_VALIDATED", "SUCCESS", "XRPL settlement validated on testnet.", {
        tx_hash: xrplProof.txHash,
        source_address: xrplProof.sourceAddress,
        destination_address: xrplProof.destinationAddress,
      });
    } else {
      xrplStatus = "NOT_REQUIRED";
      steps = updateStep(steps, "bridge_settlement", {
        status: "SKIPPED",
        attempt: 1,
        startedAt: Date.now(),
        completedAt: Date.now(),
      });
      emit("Bridge settlement skipped for this route.");
    }

    state = "EXECUTING_PAYOUT";
    const maxRetries = getMaxRetries(activeRoute);
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt += 1;
      payoutStatus = "INITIATED";
      steps = updateStep(steps, "payout_execution", {
        status: "RUNNING",
        attempt,
        startedAt: Date.now(),
      });
      emit(`Submitting payout to ${activeRoute.provider} (attempt ${attempt})...`, { payout_attempt: attempt });
      await audit("PAYOUT_INITIATED", "PENDING", "Provider payout submission started.", {
        payout_attempt: attempt,
        amount: activeRoute.receiveAmount,
        currency: transfer.recipient.currency,
        country: transfer.recipient.country,
        payout_method: transfer.recipient.payoutMethod,
      });

      try {
        payout = await withTimeout(
          createPayout({
            transferId,
            amount: activeRoute.receiveAmount,
            currency: transfer.recipient.currency,
            country: transfer.recipient.country,
            recipient: transfer.recipient,
            payoutMethod: transfer.recipient.payoutMethod,
          }),
          getTimeoutMs(activeRoute),
          "Payout provider"
        );

        payoutStatus = "PROCESSING";
        steps = updateStep(steps, "payout_execution", {
          status: "DONE",
          completedAt: Date.now(),
          telemetry: {
            payout_reference: payout.payoutReference,
            provider_id: payout.providerId,
            fallback_used: payout.fallbackUsed,
          },
        });
        await audit("PAYOUT_PROCESSING", "SUCCESS", "Provider accepted payout instruction.", {
          payout_reference: payout.payoutReference,
          provider_id: payout.providerId,
          provider_name: payout.providerName,
          fallback_used: payout.fallbackUsed,
          routing_reason: payout.routingReason,
        });
        break;
      } catch (caughtPayoutError) {
        const isFinalAttempt = attempt > maxRetries;
        await audit(
          isFinalAttempt ? "PAYOUT_FAILED" : "RETRY_SCHEDULED",
          isFinalAttempt ? "FAILED" : "INFO",
          isFinalAttempt
            ? "Provider payout failed after all retry attempts."
            : "Provider payout failed. Retry scheduled by execution engine.",
          {
            payout_attempt: attempt,
            max_retries: maxRetries,
            error: String(caughtPayoutError),
          }
        );

        if (isFinalAttempt) {
          throw caughtPayoutError;
        }

        const backoffMs = getRetryBackoffMs(activeRoute, attempt);
        emit(`Provider response failed. Retrying in ${backoffMs}ms...`, {
          retry_backoff_ms: backoffMs,
          payout_attempt: attempt,
        });
        await wait(backoffMs);
      }
    }

    if (!payout) {
      throw new Error("Payout did not return a provider reference.");
    }

    state = "VERIFYING_PAYOUT";
    steps = updateStep(steps, "payout_verification", {
      status: "RUNNING",
      attempt: 1,
      startedAt: Date.now(),
    });
    emit("Verifying provider payout status...");
    await wait(900);

    const finalStatus = await withTimeout(
      getPayoutStatus(payout.payoutReference),
      getTimeoutMs(activeRoute),
      "Payout status"
    );
    payoutStatus = finalStatus;

    if (finalStatus !== "PAID_OUT") {
      throw new Error(`Provider returned final payout status ${finalStatus}`);
    }

    steps = updateStep(steps, "payout_verification", {
      status: "DONE",
      completedAt: Date.now(),
      telemetry: {
        payout_reference: payout.payoutReference,
        final_status: finalStatus,
      },
    });
    await audit("PAYOUT_COMPLETED", "SUCCESS", "Provider payout verified as complete.", {
      payout_reference: payout.payoutReference,
      provider_name: payout.providerName,
      final_status: finalStatus,
    });

    state = "COMPLETED";
    completedTransfers.add(transferId);
    emit("Transfer delivered. Execution lifecycle completed safely.", { completed_at: Date.now() });
    await audit("ROUTE_EXECUTION_COMPLETED", "SUCCESS", "Route execution lifecycle completed.", {
      payout_reference: payout.payoutReference,
      final_status: payoutStatus,
    });

    return { completed: true, duplicate: false };
  } catch (caughtError) {
    error = String(caughtError);

    if (!failoverUsed && failoverRoute) {
      state = "FAILOVER_EVALUATION";
      failoverUsed = true;
      activeRoute = failoverRoute;
      steps = buildSteps(activeRoute);
      emit(`Primary route failed. Safe failover selected: ${activeRoute.provider}.`, {
        failover_provider: activeRoute.provider,
        primary_error: error,
      });
      await audit("FAILOVER_TRIGGERED", "INFO", "Primary route failed. Safe failover route selected.", {
        failover_route_id: activeRoute.id,
        failover_provider: activeRoute.provider,
        primary_error: error,
      });

      runningTransfers.delete(transferId);
      return runTransferExecution({
        transfer: { ...transfer, selectedRoute: activeRoute },
        selectedRoute: activeRoute,
        refreshXrpBalance,
        onSnapshot,
      });
    }

    state = "FAILED";
    payoutStatus = payoutStatus === "NOT_STARTED" ? "FAILED" : payoutStatus;
    if (xrplStatus === "PENDING") xrplStatus = "FAILED";
    steps = steps.map((step) =>
      step.status === "RUNNING" ? { ...step, status: "FAILED", completedAt: Date.now() } : step
    );
    emit("Transfer execution failed safely. Duplicate payout protection remains active.");
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
