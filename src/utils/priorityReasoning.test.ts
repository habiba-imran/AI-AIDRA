import { describe, expect, it } from 'vitest';
import type { SimulationState, Victim } from '../types';
import {
  buildPriorityReasoning,
  formatSeverityUpper,
  severityAccentClass,
} from './priorityReasoning';

function victim(p: Partial<Victim> & Pick<Victim, 'id' | 'status' | 'priorityScore'>): Victim {
  return {
    row: 1,
    col: 1,
    severity: 'moderate',
    assignedTo: null,
    survivalPct: 80,
    eta: null,
    ...p,
  } as Victim;
}

/** `buildPriorityReasoning` only reads these fields. */
function reasoningState(
  overrides: Partial<
    Pick<
      SimulationState,
      'victims' | 'cspSolution' | 'objectivePriority' | 'fuzzyLogicEnabled' | 'victimMlEstimates'
    >
  >
): SimulationState {
  return {
    victims: [],
    cspSolution: null,
    objectivePriority: 'Balanced',
    fuzzyLogicEnabled: false,
    victimMlEstimates: {},
    ...overrides,
  } as unknown as SimulationState;
}

describe('formatSeverityUpper / severityAccentClass', () => {
  it('formats severity labels', () => {
    expect(formatSeverityUpper('critical')).toBe('CRITICAL');
    expect(formatSeverityUpper('minor')).toBe('MINOR');
  });
  it('returns tailwind accent classes', () => {
    expect(severityAccentClass('critical')).toContain('red');
    expect(severityAccentClass('minor')).toContain('green');
  });
});

describe('buildPriorityReasoning', () => {
  it('orders waiting victims by priorityScore', () => {
    const pr = buildPriorityReasoning(
      reasoningState({
        victims: [
          victim({ id: 'V1', status: 'waiting', priorityScore: 5, survivalPct: 90 }),
          victim({ id: 'V2', status: 'waiting', priorityScore: 12, survivalPct: 70 }),
        ],
      })
    );
    expect(pr.hasQueue).toBe(true);
    expect(pr.primary?.id).toBe('V2');
  });

  it('reports empty queue when no waiting or en-route victims', () => {
    const pr = buildPriorityReasoning(
      reasoningState({
        victims: [victim({ id: 'V1', status: 'rescued', priorityScore: 99 })],
      })
    );
    expect(pr.hasQueue).toBe(false);
    expect(pr.primary).toBeNull();
  });

  it('includes ML snippet when estimate exists for head victim', () => {
    const pr = buildPriorityReasoning(
      reasoningState({
        victims: [victim({ id: 'V1', status: 'waiting', priorityScore: 20, severity: 'critical' })],
        victimMlEstimates: {
          V1: {
            predictedClass: 2,
            probs: [0.1, 0.2, 0.7],
            survivalEstimatePct: 66,
          },
        },
      })
    );
    expect(pr.primary?.reason).toMatch(/ML/);
  });
});
