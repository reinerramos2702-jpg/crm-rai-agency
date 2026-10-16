import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COST_ASSUMPTIONS, estimateVoiceCost, minutesForBudget, perMinuteUsd, readCostAssumptions, usageLevel,
} from '../cost';

describe('estimateVoiceCost', () => {
  it('marca el resultado como ESTIMADO y suma uso + número', () => {
    const e = estimateVoiceCost(100);
    expect(e.estimado).toBe(true);
    // 0,07 + 0,04 + 0,0085 = 0,1185 USD/min
    expect(e.perMinuteUsd).toBeCloseTo(0.1185, 4);
    expect(e.usageUsd).toBeCloseTo(11.85, 2);
    expect(e.numberUsd).toBe(1.15);
    expect(e.totalUsd).toBeCloseTo(13, 2);
  });

  it('0 minutos solo cuesta el número; valores inválidos cuentan como 0', () => {
    expect(estimateVoiceCost(0).totalUsd).toBe(1.15);
    expect(estimateVoiceCost(-5).usageUsd).toBe(0);
    expect(estimateVoiceCost(Number.NaN).usageUsd).toBe(0);
    expect(estimateVoiceCost(0, DEFAULT_COST_ASSUMPTIONS, { includeNumber: false }).totalUsd).toBe(0);
  });

  it('respeta supuestos personalizados (desvío de número)', () => {
    const a = { ...DEFAULT_COST_ASSUMPTIONS, forwardingUsdPerMin: 0.02 };
    expect(perMinuteUsd(a)).toBeCloseTo(0.1385, 4);
    expect(estimateVoiceCost(10, a).lines.some((l) => l.label === 'Desvío de número')).toBe(true);
  });
});

describe('readCostAssumptions', () => {
  it('lee VOICE_COST_* y cae al valor por defecto si es inválido', () => {
    const a = readCostAssumptions({ VOICE_COST_LLM_PER_MIN: '0.02', VOICE_COST_ENGINE_PER_MIN: 'abc', VOICE_COST_NUMBER_PER_MONTH: '-1' });
    expect(a.llmUsdPerMin).toBe(0.02);
    expect(a.voiceEngineUsdPerMin).toBe(DEFAULT_COST_ASSUMPTIONS.voiceEngineUsdPerMin);
    expect(a.numberUsdPerMonth).toBe(DEFAULT_COST_ASSUMPTIONS.numberUsdPerMonth);
  });
});

describe('minutesForBudget y usageLevel', () => {
  it('calcula los minutos que alcanza un tope', () => {
    expect(minutesForBudget(25)).toBe(Math.floor((25 - 1.15) / 0.1185));
    expect(minutesForBudget(1)).toBe(0);
    expect(minutesForBudget(0)).toBe(0);
  });

  it('avisa al 80 % y marca tope al 100 %', () => {
    expect(usageLevel(10, 25).level).toBe('ok');
    expect(usageLevel(20, 25).level).toBe('warn');
    expect(usageLevel(25, 25).level).toBe('cap');
    expect(usageLevel(30, 25).ratio).toBeCloseTo(1.2, 3);
    expect(usageLevel(5, 0).level).toBe('ok');
  });
});
