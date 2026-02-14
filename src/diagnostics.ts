export interface RuntimeSnapshot {
  timestamp: number;
  reloadDurationMs: number;
  watcherCount: number;
  registrationCount: number;
  heapUsedBytes: number;
}

export interface DiagnosticThresholds {
  maxHeapGrowthBytes: number;
  maxReloadDurationMs: number;
}

export interface DiagnosticResult {
  pass: boolean;
  reasons: string[];
  snapshots: RuntimeSnapshot[];
}

const snapshots: RuntimeSnapshot[] = [];

export const DEFAULT_THRESHOLDS: DiagnosticThresholds = {
  maxHeapGrowthBytes: 10 * 1024 * 1024,
  maxReloadDurationMs: 2000,
};

export function clearRuntimeSnapshots() {
  snapshots.length = 0;
}

export function recordRuntimeSnapshot(
  reloadDurationMs: number,
  watcherCount: number,
  registrationCount: number
): RuntimeSnapshot {
  const snapshot: RuntimeSnapshot = {
    timestamp: Date.now(),
    reloadDurationMs,
    watcherCount,
    registrationCount,
    heapUsedBytes: process.memoryUsage().heapUsed,
  };
  snapshots.push(snapshot);
  return snapshot;
}

export function getRuntimeSnapshots(): RuntimeSnapshot[] {
  return snapshots.slice();
}

export function evaluateRuntimeSnapshots(
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS,
  targetSnapshots: RuntimeSnapshot[] = snapshots
): DiagnosticResult {
  const reasons: string[] = [];

  if (!targetSnapshots.length) {
    reasons.push('没有可用诊断快照');
    return { pass: false, reasons, snapshots: [] };
  }

  const first = targetSnapshots[0];
  const last = targetSnapshots[targetSnapshots.length - 1];
  const heapGrowth = last.heapUsedBytes - first.heapUsedBytes;

  if (heapGrowth > thresholds.maxHeapGrowthBytes) {
    reasons.push(
      `内存增长超阈值: ${heapGrowth} > ${thresholds.maxHeapGrowthBytes}`
    );
  }

  targetSnapshots.forEach((item, index) => {
    if (item.reloadDurationMs > thresholds.maxReloadDurationMs) {
      reasons.push(
        `第 ${index + 1} 次重载耗时超阈值: ${item.reloadDurationMs}ms > ${thresholds.maxReloadDurationMs}ms`
      );
    }
  });

  for (let i = 1; i < targetSnapshots.length; i++) {
    const prev = targetSnapshots[i - 1];
    const curr = targetSnapshots[i];
    if (curr.watcherCount > prev.watcherCount) {
      reasons.push(
        `watcher 数量出现增长趋势: ${prev.watcherCount} -> ${curr.watcherCount}`
      );
      break;
    }
    if (curr.registrationCount > prev.registrationCount) {
      reasons.push(
        `注册项数量出现增长趋势: ${prev.registrationCount} -> ${curr.registrationCount}`
      );
      break;
    }
  }

  return {
    pass: reasons.length === 0,
    reasons,
    snapshots: targetSnapshots.slice(),
  };
}

export async function runStressDiagnostics(
  cycles: number,
  reloadOnce: () => Promise<RuntimeSnapshot>,
  thresholds: DiagnosticThresholds = DEFAULT_THRESHOLDS
): Promise<DiagnosticResult> {
  clearRuntimeSnapshots();
  for (let i = 0; i < cycles; i++) {
    const beforeLength = snapshots.length;
    const snapshot = await reloadOnce();
    if (snapshots.length === beforeLength) {
      snapshots.push(snapshot);
    }
  }
  return evaluateRuntimeSnapshots(thresholds);
}
