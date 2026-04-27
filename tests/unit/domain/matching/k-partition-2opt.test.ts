import { describe, it } from 'vitest';

describe('KPartition2Opt', () => {
  it.todo('same input + same seed → same output (determinism)');
  it.todo('all presentees are assigned to tables (presenters excluded from seating)');
  it.todo('each table has 3 or 4 members; N=5 presentees may yield one table of 5');
  it.todo('soft objective: maximizes 2F:2M 4-person tables (lexicographic priority 2)');
  it.todo('handles 3v3 (6 participants, 2 tables of 3)');
  it.todo('handles 3v5 (8 participants, 2 tables of 4)');
  it.todo('handles participants with zero votes');
  it.todo('dynamic rebalancing: removing a participant and recomputing satisfies hard constraints');
  it.todo('N=20 completes within 300ms');
  it.todo('score improves or stays equal across 2-opt iterations');
});
