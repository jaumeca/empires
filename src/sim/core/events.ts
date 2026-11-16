/**
 * Domain events emitted by the simulation. The presentation layer consumes them
 * to drive bubbles, animations and notifications. They are never persisted.
 */
export type Severity = 'info' | 'important' | 'decisive';

export type SimEvent =
  | { type: 'day_started'; day: number; severity: 'info' }
  | { type: 'work'; empirianId: string; kind: 'design' | 'tech' | 'test' | 'polish'; amount: number; severity: 'info' }
  | { type: 'bug_created'; empirianId: string; count: number; severity: 'info' }
  | { type: 'bug_found'; empirianId: string; count: number; severity: 'info' }
  | { type: 'bug_fixed'; empirianId: string; count: number; severity: 'info' }
  | { type: 'idea'; empirianId: string; severity: 'info' }
  | { type: 'quality_up'; empirianId: string; severity: 'info' }
  | { type: 'energy_low'; empirianId: string; severity: 'important' }
  | { type: 'phase_changed'; projectId: string; phase: string; severity: 'important' }
  | { type: 'decision_requested'; decisionId: string; severity: 'decisive' }
  | { type: 'decision_resolved'; decisionId: string; optionId: string; severity: 'info' }
  | { type: 'project_started'; projectId: string; severity: 'important' }
  | { type: 'project_released'; projectId: string; severity: 'decisive' }
  | { type: 'sales_week'; projectId: string; units: number; revenue: number; severity: 'info' }
  | { type: 'money_low'; severity: 'important' }
  | { type: 'office_changed'; severity: 'info' }
  | { type: 'contract_done'; contractId: string; pay: number; lateDays: number; severity: 'important' }
  | { type: 'news'; newsId: string; kind: string; importance: 'major' | 'minor'; severity: 'important' | 'info' }
  | { type: 'coffee'; empirianId: string; severity: 'info' }
  | { type: 'skill_up'; empirianId: string; skill: string; level: number; severity: 'important' };

export type EventSink = (e: SimEvent) => void;
