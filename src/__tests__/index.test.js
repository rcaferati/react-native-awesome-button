import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AwesomeButton from '../Button';

const DEFAULT_TEXT = 'Default';

describe('AwesomeButton', () => {
  it('should render', () => {
    const component = renderer.create(<AwesomeButton />).toJSON();

    expect(component).toMatchSnapshot();
  });

  it('should render with a view container', () => {
    const component = renderer.create(<AwesomeButton />).toJSON();

    expect(component.type).toEqual('View');
  });

  it('should render a default text children', () => {
    const component = renderer.create(
      <AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>
    );
    const element = component.root.findByProps({
      testID: 'aws-btn-content-text',
    });

    expect(element.props.children).toEqual(DEFAULT_TEXT);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('should render the button shadow element', () => {
    const component = renderer.create(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-shadow' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-shadow');
  });

  it('should render the button bottom element', () => {
    const component = renderer.create(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-bottom' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-bottom');
  });

  it('should render the button content element', () => {
    const component = renderer.create(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-content' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-content');
  });

  it('should render the button text view', () => {
    const component = renderer.create(
      <AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>
    );
    const element = component.root.findByProps({ testID: 'aws-btn-text' });

    expect(element.props.testID).toBe('aws-btn-text');
  });

  it('should render the button progress view', () => {
    const component = renderer.create(
      <AwesomeButton progress>{DEFAULT_TEXT}</AwesomeButton>
    );
    const view = component.root.findByProps({ testID: 'aws-btn-content-view' });
    // const element = component.root.findByProps({ testID: "aws-btn-progress" });
    expect(view.props.testID).toBe('aws-btn-content-view');
  });

  it('should render the button active background', () => {
    const component = renderer.create(
      <AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>
    );
    const element = component.root.findByProps({
      testID: 'aws-btn-active-background',
    });

    expect(element.props.testID).toBe('aws-btn-active-background');
  });

  it('should render the content placeholder on empty button', () => {
    const component = renderer.create(<AwesomeButton />);
    const element = component.root.findByProps({
      testID: 'aws-btn-content-placeholder',
    });

    expect(element.props.testID).toBe('aws-btn-content-placeholder');
  });

  it('should treat width auto as the measured auto-width mode', () => {
    let component;

    act(() => {
      component = renderer.create(
        <AwesomeButton width="auto">{DEFAULT_TEXT}</AwesomeButton>
      );
    });

    const container = component.root.findByProps({ testID: 'aws-btn-content-2' });
    const hiddenMeasure = component.root.findByProps({
      testID: 'aws-btn-hidden-measure',
    });

    expect(container.props.style[1].width).toBeUndefined();

    act(() => {
      hiddenMeasure.props.onLayout({
        nativeEvent: {
          layout: {
            width: 132,
          },
        },
      });
    });

    expect(
      component.root
        .findByProps({ testID: 'aws-btn-content-2' })
        .props.style.some((style) => style?.width === 132)
    ).toBe(true);
  });
});
