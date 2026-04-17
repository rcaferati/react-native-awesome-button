import React from 'react';
import { View } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import Placeholder from '../Placeholder';
import { animateLoop } from '../helpers';

jest.mock('../helpers', () => ({
  animateLoop: jest.fn(() => ({
    stop: jest.fn(),
  })),
}));

describe('Placeholder', () => {
  beforeEach(() => {
    animateLoop.mockClear();
  });

  it('restarts its shimmer loop cleanly when animated toggles back on', () => {
    const firstLoopStop = jest.fn();
    const secondLoopStop = jest.fn();

    animateLoop
      .mockReturnValueOnce({
        stop: firstLoopStop,
      })
      .mockReturnValueOnce({
        stop: secondLoopStop,
      });

    const component = renderer.create(<Placeholder animated={false} />);
    const placeholderView = component.root.findByType(View);

    act(() => {
      placeholderView.props.onLayout({
        nativeEvent: {
          layout: {
            width: 120,
          },
        },
      });
    });

    act(() => {
      component.update(<Placeholder animated />);
    });

    expect(animateLoop).toHaveBeenCalledTimes(1);

    act(() => {
      component.update(<Placeholder animated={false} />);
    });

    expect(firstLoopStop).toHaveBeenCalledTimes(1);

    act(() => {
      component.update(<Placeholder animated />);
    });

    expect(animateLoop).toHaveBeenCalledTimes(2);

    act(() => {
      component.unmount();
    });

    expect(secondLoopStop).toHaveBeenCalledTimes(1);
  });
});
