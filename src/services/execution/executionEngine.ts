import { executeXrplTestnetSettlement, XrplSettlementResult } from "../../lib/xrplSettlement";
import { RouteQuote, Transfer } from "../../types/transfer";
import { createPayout, getPayoutStatus } from "../payout/payoutAdapter";
import { PayoutResult, PayoutStatus } from "../payout/payoutTypes";
import { writeTransactionAuditLog } from "../transactionAuditService";
import { persistExecutionSnapshot } from "./executionPersistenceService";

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

function getErrorMessage(caughtError: unknown) {
  if (caughtError instanceof Error) return caughtError.message;
  return String(caughtError);
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
    };

    onSnapshot(snapshot);
    await persistExecutionSnapshot(snapshot);
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

  async function runRouteLifecycle() {
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
          executeXrplTestnetSettlement({ gbpAmount: transfer.senderAmount ?? 0 }),
          Math.max(getTimeoutMs(activeRoute), 15000),
          "XRPL settlement"
        );
        xrplStatus = "COMPLETED";
        steps = completeStep(steps, "bridge_settlement", {
          tx_hash: xrplProof.txHash,
          xrp_amount: xrplProof.xrpAmount,
          settlement_rate: xrplProof.settlementRate,
        });
        await refreshXrpBalance?.();
        await emit("XRPL bridge proof validated on testnet.", {
          xrpl_tx_hash: xrplProof.txHash,
        });
        await audit("XRPL_VALIDATED", "SUCCESS", "XRPL bridge settlement validated.", {
          tx_hash: xrplProof.txHash,
          xrp_amount: xrplProof.xrpAmount,
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
      await emit("Bridge settlement skipped for this fiat route.");
    }

    state = "EXECUTING_PAYOUT";
    const maxRetries = getMaxRetries(activeRoute);
    const totalAttempts = maxRetries + 1;

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      steps = updateStep(steps, "payout_execution", {
        status: "RUNNING",
        attempt,
        startedAt: Date.now(),
        provider: activeRoute.provider,
      });
      payoutStatus = attempt === 1 ? "NOT_STARTED" : payoutStatus;
      await emit(`Submitting payout via ${activeRoute.provider}...`, {
        payout_attempt: attempt,
        payout_total_attempts: totalAttempts,
      });
      await audit("PAYOUT_INITIATED", "PENDING", "Provider payout submission started.", {
        attempt,
        total_attempts: totalAttempts,
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
            payoutProviderName: activeRoute.provider,
          }),
          getTimeoutMs(activeRoute),
          `${activeRoute.provider} payout submission`
        );

        payoutStatus = payout.status;
        steps = completeStep(steps, "payout_execution", {
          payout_reference: payout.payoutReference,
          provider_id: payout.providerId,
          fallback_used: payout.fallbackUsed ?? false,
        });
        await emit("Provider payout accepted by adapter.", {
          payout_reference: payout.payoutReference,
          payout_provider_id: payout.providerId,
        });
        break;
      } catch (caughtError) {
        const payoutError = getErrorMessage(caughtError);

        if (attempt < totalAttempts) {
          const backoffMs = getRetryBackoffMs(activeRoute, attempt);
          await audit("RETRY_SCHEDULED", "INFO", "Provider payout submission retry scheduled.", {
            attempt,
            next_attempt: attempt + 1,
            backoff_ms: backoffMs,
            error: payoutError,
          });
          await emit(`Provider submission attempt ${attempt} failed. Retrying safely...`, {
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
        });
        throw new Error(`Payout submission failed: ${payoutError}`);
      }
    }

    if (!payout) {
      throw new Error("Payout adapter did not return a payout reference.");
    }

    state = "VERIFYING_PAYOUT";
    payoutStatus = payoutStatus === "INITIATED" ? "PROCESSING" : payoutStatus;
    steps = updateStep(steps, "payout_verification", {
      status: "RUNNING",
      attempt: 1,
      startedAt: Date.now(),
      provider: activeRoute.provider,
    });
    await emit("Verifying destination payout status...", {
      payout_reference: payout.payoutReference,
    });
    await audit("PAYOUT_PROCESSING", "PENDING", "Provider payout verification started.", {
      payout_reference: payout.payoutReference,
    });

    payoutStatus = await withTimeout(
      getPayoutStatus(payout.payoutReference),
      getTimeoutMs(activeRoute),
      `${activeRoute.provider} payout verification`
    );

    if (payoutStatus !== "PAID_OUT") {
      steps = failStep(steps, "payout_verification", {
        payout_reference: payout.payoutReference,
        payout_status: payoutStatus,
      });
      throw new Error(`Payout verification returned ${payoutStatus}.`);
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

  if (completedTransfers.has(transferId)) {
    state = "COMPLETED";
    steps = steps.map((step) => ({ ...step, status: "DONE", completedAt: step.completedAt ?? Date.now() }));
    await emit("Transfer was already completed. Duplicate execution ignored safely.");
    await audit("IDEMPOTENCY_BLOCKED", "INFO", "Duplicate execution ignored because transfer is already complete.");
    return { completed: true, duplicate: true };
  }

  if (runningTransfers.has(transferId)) {
    state = "VALIDATING_IDEMPOTENCY";
    await emit("Execution is already running. Duplicate start request blocked.");
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

      await wait(500);
      activeRoute = failoverRoute;
      failoverUsed = true;
      payout = undefined;
      payoutStatus = "NOT_STARTED";
      xrplProof = undefined;
      xrplStatus = activeRoute.rail === "HYBRID" ? "PENDING" : "NOT_REQUIRED";
      error = undefined;
      steps = buildSteps(activeRoute);
      steps = completeStep(steps, "idempotency", {
        idempotency_key: idempotencyKey,
        failover_lock_reused: true,
      });
      await emit(`Failover activated. Continuing via ${activeRoute.provider}...`, {
        failover_route_id: activeRoute.id,
      });

      await runRouteLifecycle();
    }

    state = "COMPLETED";
    completedTransfers.add(transferId);
    steps = steps.map((step) =>
      step.status === "PENDING" || step.status === "RUNNING"
        ? { ...step, status: "DONE", completedAt: Date.now() }
        : step
    );
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
