const assert = require('assert');
const {
  clearRuntimeSnapshots,
  recordRuntimeSnapshot,
  getRuntimeSnapshots,
  evaluateRuntimeSnapshots,
  runStressDiagnostics,
} = require('../../out/diagnostics');

describe('diagnostics', () => {
  beforeEach(() => {
    clearRuntimeSnapshots();
  });

  it('可记录并读取运行时快照', () => {
    recordRuntimeSnapshot(120, 3, 6);
    const snapshots = getRuntimeSnapshots();
    assert.strictEqual(snapshots.length, 1);
    assert.strictEqual(snapshots[0].reloadDurationMs, 120);
  });

  it('可对阈值超限与增长趋势做失败判定', () => {
    const snapshots = [
      {
        timestamp: 1,
        reloadDurationMs: 100,
        watcherCount: 2,
        registrationCount: 4,
        heapUsedBytes: 1000,
      },
      {
        timestamp: 2,
        reloadDurationMs: 250,
        watcherCount: 3,
        registrationCount: 5,
        heapUsedBytes: 2200,
      },
    ];

    const result = evaluateRuntimeSnapshots(
      { maxHeapGrowthBytes: 500, maxReloadDurationMs: 200 },
      snapshots
    );

    assert.strictEqual(result.pass, false);
    assert.ok(result.reasons.length >= 1);
  });

  it('可执行固定轮次压力诊断', async () => {
    let count = 0;
    const result = await runStressDiagnostics(3, async () => {
      count += 1;
      return {
        timestamp: Date.now(),
        reloadDurationMs: 50,
        watcherCount: 2,
        registrationCount: 2,
        heapUsedBytes: 1000,
      };
    });

    assert.strictEqual(count, 3);
    assert.strictEqual(result.snapshots.length, 3);
  });
});
