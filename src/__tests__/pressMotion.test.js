import {
  getPressedOpacity,
  origamiFrictionToDamping,
  origamiTensionToStiffness,
  PRESS_IN_DURATION_MS,
  PRESS_IN_TIMING_CONFIG,
  PRESS_IN_EASING,
  PRESS_RELEASE_SPRING_CONFIG,
  PRESS_RELEASE_TIMING_DURATION_MS,
  PRESS_RELEASE_TIMING_CONFIG,
} from '../pressMotion';

describe('pressMotion', () => {
  it('exports the canonical press timings', () => {
    expect(PRESS_IN_TIMING_CONFIG).toEqual({
      duration: PRESS_IN_DURATION_MS,
      easing: PRESS_IN_EASING,
    });
    expect(PRESS_RELEASE_TIMING_CONFIG).toEqual({
      duration: PRESS_RELEASE_TIMING_DURATION_MS,
      easing: expect.any(Function),
    });
  });

  it('converts the Flutter origami spring constants into the release spring config', () => {
    expect(origamiTensionToStiffness(100)).toBeCloseTo(447.4, 5);
    expect(origamiFrictionToDamping(6.75)).toBeCloseTo(21.25, 5);
    expect(PRESS_RELEASE_SPRING_CONFIG).toMatchObject({
      mass: 1,
      stiffness: 447.4,
      damping: 21.25,
      velocity: 0,
      overshootClamping: false,
    });
  });

  it('maps overall pressed opacity from the shared press progress value', () => {
    expect(
      getPressedOpacity({
        activeOpacity: 0.6,
        pressProgress: 0,
        progress: false,
      })
    ).toBe(1);
    expect(
      getPressedOpacity({
        activeOpacity: 0.6,
        pressProgress: 1,
        progress: false,
      })
    ).toBe(0.6);
    expect(
      getPressedOpacity({
        activeOpacity: 0.6,
        pressProgress: -0.5,
        progress: false,
      })
    ).toBe(1);
    expect(
      getPressedOpacity({
        activeOpacity: 0.6,
        pressProgress: 3,
        progress: false,
      })
    ).toBe(0.6);
    expect(
      getPressedOpacity({
        activeOpacity: 0.2,
        pressProgress: 1,
        progress: true,
      })
    ).toBe(1);
  });
});
