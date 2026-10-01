import { COUNTERFEIT_RULES } from '@game/data';
import { hashSeed } from './weather';

export interface CounterfeitOutcome {
  counterfeit: boolean;
  detected: boolean;
  faceValue: number;
}

function unit(seed: string): number {
  let value = hashSeed(seed) >>> 0;
  value = (Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0);
  value = (Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0);
  value = (value ^ (value >>> 16)) >>> 0;
  return value / 0x1_0000_0000;
}

/** Stable checkout outcome. A given day/checkout/detector produces the same result on every replay. */
export function assessCounterfeit(
  day: number,
  checkoutId: string,
  saleTotal: number,
  detector: { kind: 'player' } | { kind: 'staff'; accuracy: number },
): CounterfeitOutcome {
  const base = `${day}:counterfeit:${checkoutId}`;
  if (unit(`${base}:presence`) >= COUNTERFEIT_RULES.transactionChance || saleTotal < COUNTERFEIT_RULES.denominations[0]) {
    return { counterfeit: false, detected: false, faceValue: 0 };
  }
  const notes = COUNTERFEIT_RULES.denominations.filter((value) => value <= saleTotal);
  const faceValue = notes[Math.floor(unit(`${base}:denomination`) * notes.length)];
  const accuracy = detector.kind === 'player'
    ? COUNTERFEIT_RULES.playerDetectChance
    : Math.min(COUNTERFEIT_RULES.staffDetectCap, COUNTERFEIT_RULES.staffDetectBase + Math.max(0, detector.accuracy) * COUNTERFEIT_RULES.staffAccuracyBonus);
  return {
    counterfeit: true,
    detected: unit(`${base}:detection`) < accuracy,
    faceValue,
  };
}
