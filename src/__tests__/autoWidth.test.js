import { getNextStateWidth } from '../useAutoWidth';

describe('auto width helpers', () => {
  it('keeps the current width when the next measured width is unchanged or smaller', () => {
    expect(getNextStateWidth(null, 100)).toBe(100);
    expect(getNextStateWidth(100, 100)).toBe(100);
    expect(getNextStateWidth(120, 100)).toBe(120);
  });
});
