import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import { __autoWidthMeasurementTesting } from '../autoWidthMeasurement';
import AwesomeButton from '../Button';

const DEFAULT_TEXT = 'Default';
const flushMicrotasks = async () => Promise.resolve();

const createButton = (element) => {
  let component;

  act(() => {
    component = renderer.create(element);
  });

  return component;
};

describe('AwesomeButton', () => {
  let mountedComponents;

  beforeEach(() => {
    mountedComponents = [];
    __autoWidthMeasurementTesting.reset();
  });

  afterEach(() => {
    mountedComponents.forEach((component) => {
      act(() => {
        component.unmount();
      });
    });

    mountedComponents = [];
    __autoWidthMeasurementTesting.reset();
  });

  it('should render', () => {
    const root = createButton(<AwesomeButton />);
    mountedComponents.push(root);
    const component = root.toJSON();

    expect(component).toMatchSnapshot();
  });

  it('should render with a view container', () => {
    const root = createButton(<AwesomeButton />);
    mountedComponents.push(root);
    const component = root.toJSON();

    expect(component.type).toEqual('View');
  });

  it('should render a default text children', () => {
    const component = createButton(<AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>);
    mountedComponents.push(component);
    const element = component.root.findByProps({
      testID: 'aws-btn-content-text',
    });

    expect(element.props.children).toEqual(DEFAULT_TEXT);
    expect(component.toJSON()).toMatchSnapshot();
  });

  it('does not force visible string labels onto a single line', () => {
    const component = createButton(<AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>);
    mountedComponents.push(component);
    const element = component.root.findByProps({
      testID: 'aws-btn-content-text',
    });

    expect(element.props.numberOfLines).toBeUndefined();
    expect(element.props.ellipsizeMode).toBeUndefined();
  });

  it('should render the button shadow element', () => {
    const component = createButton(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    mountedComponents.push(component);
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-shadow' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-shadow');
  });

  it('should render the button bottom element', () => {
    const component = createButton(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    mountedComponents.push(component);
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-bottom' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-bottom');
  });

  it('should render the button content element', () => {
    const component = createButton(
      <AwesomeButton raiseLevel={12} height={60}>
        {DEFAULT_TEXT}
      </AwesomeButton>
    );
    mountedComponents.push(component);
    const { height, raiseLevel } = component.root.props;
    const element = component.root.findByProps({ testID: 'aws-btn-content' });

    expect(element.props.style[1].height).toBe(height - raiseLevel);
    expect(element.props.testID).toBe('aws-btn-content');
  });

  it('should render the button text view', () => {
    const component = createButton(<AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>);
    mountedComponents.push(component);
    const element = component.root.findByProps({ testID: 'aws-btn-text' });

    expect(element.props.testID).toBe('aws-btn-text');
  });

  it('should render the button progress view', () => {
    const component = createButton(
      <AwesomeButton progress>{DEFAULT_TEXT}</AwesomeButton>
    );
    mountedComponents.push(component);
    const view = component.root.findByProps({ testID: 'aws-btn-content-view' });
    // const element = component.root.findByProps({ testID: "aws-btn-progress" });
    expect(view.props.testID).toBe('aws-btn-content-view');
  });

  it('should render the button active background', () => {
    const component = createButton(<AwesomeButton>{DEFAULT_TEXT}</AwesomeButton>);
    mountedComponents.push(component);
    const element = component.root.findByProps({
      testID: 'aws-btn-active-background',
    });

    expect(element.props.testID).toBe('aws-btn-active-background');
  });

  it('should render the content placeholder on empty button', () => {
    const component = createButton(<AwesomeButton />);
    mountedComponents.push(component);
    const element = component.root.findByProps({
      testID: 'aws-btn-content-placeholder',
    });

    expect(element.props.testID).toBe('aws-btn-content-placeholder');
  });

  it('should treat width auto as the measured auto-width mode', async () => {
    let component;

    act(() => {
      component = renderer.create(
        <AwesomeButton width="auto">{DEFAULT_TEXT}</AwesomeButton>
      );
    });
    mountedComponents.push(component);

    const container = component.root.findByProps({ testID: 'aws-btn-content-2' });
    expect(container.props.style[1].width).toBeUndefined();

    await act(async () => {
      expect(__autoWidthMeasurementTesting.resolveActiveMeasurement(132)).toBe(
        true
      );
      await flushMicrotasks();
    });

    expect(
      component.root
        .findByProps({ testID: 'aws-btn-content-2' })
        .props.style.some((style) => style?.width === 132)
    ).toBe(true);
  });

  it('measures hidden auto-width text on a single line', () => {
    const component = createButton(
      <AwesomeButton width="auto">{DEFAULT_TEXT}</AwesomeButton>
    );
    mountedComponents.push(component);
    const hiddenMeasureText = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-text',
    });

    expect(hiddenMeasureText.props.numberOfLines).toBe(1);
    expect(hiddenMeasureText.props.ellipsizeMode).toBe('clip');
  });

  it('renders hidden auto-width measurement through a detached modal host', () => {
    const component = createButton(
      <AwesomeButton width="auto">{DEFAULT_TEXT}</AwesomeButton>
    );
    mountedComponents.push(component);
    const hiddenMeasureModal = component.root.findByType(Modal);
    const hiddenMeasureHost = component.root.findByProps({
      testID: 'aws-btn-hidden-measure-host',
    });

    expect(hiddenMeasureModal.props.visible).toBe(true);
    expect(hiddenMeasureModal.props.transparent).toBe(true);
    expect(hiddenMeasureHost.props.pointerEvents).toBe('none');
  });
});
