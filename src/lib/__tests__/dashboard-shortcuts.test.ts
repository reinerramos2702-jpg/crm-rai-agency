import { describe, expect, it } from 'vitest';
import { isTypingTarget, shortcutFor } from '../dashboard-shortcuts';

const free = { typing: false, blocked: false };

describe('shortcutFor', () => {
  it('mapea las teclas del Dashboard', () => {
    expect(shortcutFor({ key: 'n' }, free)).toBe('new-campaign');
    expect(shortcutFor({ key: 'N' }, free)).toBe('new-campaign');
    expect(shortcutFor({ key: '/' }, free)).toBe('focus-search');
    expect(shortcutFor({ key: 'r' }, free)).toBe('refresh');
    expect(shortcutFor({ key: '7' }, free)).toBe('period-7');
    expect(shortcutFor({ key: '3' }, free)).toBe('period-30');
    expect(shortcutFor({ key: 'p' }, free)).toBe('customize');
    expect(shortcutFor({ key: 'x' }, free)).toBeNull();
  });

  it('no actúa al escribir, con diálogos abiertos ni con modificadores (Ctrl+K, Ctrl+B)', () => {
    expect(shortcutFor({ key: 'n' }, { typing: true, blocked: false })).toBeNull();
    expect(shortcutFor({ key: 'n' }, { typing: false, blocked: true })).toBeNull();
    expect(shortcutFor({ key: 'k', ctrlKey: true }, free)).toBeNull();
    expect(shortcutFor({ key: 'r', metaKey: true }, free)).toBeNull();
    expect(shortcutFor({ key: 'n', altKey: true }, free)).toBeNull();
    expect(shortcutFor({ key: 'n', isComposing: true }, free)).toBeNull();
  });
});

describe('isTypingTarget', () => {
  it('detecta campos editables', () => {
    expect(isTypingTarget({ tagName: 'INPUT' })).toBe(true);
    expect(isTypingTarget({ tagName: 'textarea' })).toBe(true);
    expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(isTypingTarget({ tagName: 'BUTTON' })).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});
