import { getAutoWidthTextFlow } from '../useButtonSizeBehavior';

describe('auto width helpers', () => {
  it('resolves initial, grow, shrink, and same-width flows from the measured target width', () => {
    expect(getAutoWidthTextFlow(null, 100)).toBe('initial');
    expect(getAutoWidthTextFlow(100, 100)).toBe('text-only');
    expect(getAutoWidthTextFlow(100, 140)).toBe('grow-first');
    expect(getAutoWidthTextFlow(140, 100)).toBe('shrink-last');
  });
});
