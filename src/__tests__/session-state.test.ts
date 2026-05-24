import { describe, it, expect, beforeEach } from 'vitest';
import { getDefaultType, setDefaultType, getSessionState } from '../utils/session-state.js';

describe('session-state', () => {
  beforeEach(() => {
    setDefaultType(undefined);
  });

  it('defaults to undefined', () => {
    expect(getDefaultType()).toBeUndefined();
  });

  it('sets and gets a type', () => {
    setDefaultType('agent');
    expect(getDefaultType()).toBe('agent');
  });

  it('clears when set to undefined', () => {
    setDefaultType('workflow');
    expect(getDefaultType()).toBe('workflow');
    setDefaultType(undefined);
    expect(getDefaultType()).toBeUndefined();
  });

  it('overwrites previous value', () => {
    setDefaultType('agent');
    setDefaultType('command');
    expect(getDefaultType()).toBe('command');
  });

  it('getSessionState returns full state object', () => {
    setDefaultType('pipeline');
    expect(getSessionState()).toEqual({ defaultType: 'pipeline' });
  });

  it('getSessionState returns undefined defaultType when cleared', () => {
    expect(getSessionState()).toEqual({ defaultType: undefined });
  });
});
