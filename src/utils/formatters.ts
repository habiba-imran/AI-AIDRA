import type { SeverityLevel, VictimStatus } from '../types';

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function formatElapsed(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `T+ ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

export function getSeverityColor(sev: SeverityLevel): string {
  switch (sev) {
    case 'critical':
      return 'text-red-400';
    case 'moderate':
      return 'text-amber-400';
    case 'minor':
      return 'text-green-400';
    default: {
      const _exhaustive: never = sev;
      return _exhaustive;
    }
  }
}

export function getStatusColor(st: VictimStatus): string {
  switch (st) {
    case 'waiting':
      return 'text-slate-400';
    case 'en-route':
      return 'text-blue-400';
    case 'rescued':
      return 'text-green-400';
    case 'lost':
      return 'text-red-500';
    default: {
      const _exhaustive: never = st;
      return _exhaustive;
    }
  }
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

export function getCellRiskColor(risk: number): string {
  if (risk >= 0 && risk < 0.2) return '#14532d';
  if (risk >= 0.2 && risk < 0.4) return '#1e293b';
  if (risk >= 0.4 && risk < 0.6) return '#451a03';
  if (risk >= 0.6 && risk < 0.8) return '#450a0a';
  return '#7f1d1d';
}
