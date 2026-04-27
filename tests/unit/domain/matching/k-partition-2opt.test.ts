import { describe, it } from 'vitest';

describe('KPartition2Opt', () => {
  it.todo('same input + same seed → same output (determinism)');
  it.todo('all participants are assigned (no leftovers when divisible by 3-4)');
  it.todo('each table has 3 or 4 members');
  it.todo('gender balance: tables are 2F:2M (±1 tolerance)');
  it.todo('presenter pair is never at the same table');
  it.todo('handles 3v3 (6 participants, 2 tables of 3)');
  it.todo('handles 3v5 (8 participants, 2 tables of 4)');
  it.todo('handles participants with zero votes');
  it.todo('dynamic rebalancing: removing a participant and recomputing satisfies hard constraints');
  it.todo('N=20 completes within 300ms');
  it.todo('score improves or stays equal across 2-opt iterations');
});
