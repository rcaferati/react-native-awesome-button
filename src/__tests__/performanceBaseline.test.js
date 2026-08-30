import React, { Profiler } from 'react';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';

let mockDeferAnimations = false;

jest.mock('../helpers', () => {
  const actualHelpers = jest.requireActual('../helpers');
  const createAnimation = () => {
    let timer = null;
    return {
      start: (callback) => {
        if (mockDeferAnimations) {
          timer = setTimeout(() => callback?.({ finished: true }), 1);
        } else {
          callback?.({ finished: true });
        }
      },
      stop: jest.fn(() => {
        if (timer !== null) {
          clearTimeout(timer);
        }
      }),
    };
  };
  return {
    ...actualHelpers,
    animateElastic: jest.fn(() => createAnimation()),
    animateSpring: jest.fn(() => createAnimation()),
    animateTiming: jest.fn(() => createAnimation()),
  };
});

const WARM_UP_REPETITIONS = 5;
const MEASURED_REPETITIONS = 25;

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const runUpdateSequence = () => {
  let commits = 0;
  const onRender = () => {
    commits += 1;
  };
  const startedAt = process.hrtime.bigint();
  let component;

  act(() => {
    component = renderer.create(
      <Profiler id="awesome-button" onRender={onRender}>
        <AwesomeButton
          buttonStyle={{ backgroundColor: '#111111' }}
          faceHeight={48}
          onPress={() => undefined}
        >
          A
        </AwesomeButton>
      </Profiler>
    );
  });

  for (const [label, color, height] of [
    ['B', '#222222', 52],
    ['C', '#333333', 56],
    ['D', '#444444', 60],
  ]) {
    act(() => {
      component.update(
        <Profiler id="awesome-button" onRender={onRender}>
          <AwesomeButton
            buttonStyle={{ backgroundColor: color }}
            faceHeight={height}
            onPress={() => label}
          >
            {label}
          </AwesomeButton>
        </Profiler>
      );
    });
  }

  act(() => component.unmount());
  const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  return { commits, durationMs };
};

describe('package performance baseline', () => {
  it('records deterministic profiler commits for rapid configuration updates', () => {
    for (let index = 0; index < WARM_UP_REPETITIONS; index += 1) {
      runUpdateSequence();
    }

    const samples = Array.from(
      { length: MEASURED_REPETITIONS },
      runUpdateSequence
    );
    const durations = samples.map(({ durationMs }) => durationMs);
    const medianDuration = median(durations);
    const medianAbsoluteDeviation = median(
      durations.map((duration) => Math.abs(duration - medianDuration))
    );

    expect(new Set(samples.map(({ commits }) => commits))).toEqual(
      new Set([8])
    );
    expect(durations.every(Number.isFinite)).toBe(true);

    console.info(
      JSON.stringify({
        benchmark: 'rapid-configuration-updates',
        warmUpRepetitions: WARM_UP_REPETITIONS,
        measuredRepetitions: MEASURED_REPETITIONS,
        commitsPerRepetition: 8,
        medianDurationMs: Number(medianDuration.toFixed(3)),
        medianAbsoluteDeviationMs: Number(medianAbsoluteDeviation.toFixed(3)),
      })
    );
  });

  it('does not dispatch accepted progress completion after teardown', () => {
    jest.useFakeTimers();
    mockDeferAnimations = true;
    const completion = jest.fn();
    let component;

    act(() => {
      component = renderer.create(
        <AwesomeButton
          progress
          progressLoadingTime={100}
          onPress={(next) => next?.(completion)}
        >
          Save
        </AwesomeButton>
      );
    });
    act(() => {
      component.root
        .findByProps({ testID: 'aws-btn-content-view' })
        .props.onPress();
      component.unmount();
    });
    act(() => {
      jest.runAllTimers();
    });

    expect(completion).not.toHaveBeenCalled();
    mockDeferAnimations = false;
    jest.useRealTimers();
  });
});
