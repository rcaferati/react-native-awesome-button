import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Text,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

const MAX_CACHED_WIDTHS = 250;

type MeasurementStyleInput = {
  borderWidth: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
  textColor?: string;
  textFontFamily?: string;
  textLineHeight?: number;
  textSize?: number;
};

type AutoWidthMeasurementRequestInput = MeasurementStyleInput & {
  signature: string;
  text: string;
};

type AutoWidthMeasurementRequest = {
  id: number;
  input: AutoWidthMeasurementRequestInput;
  resolvers: Array<(width: number) => void>;
};

type HostSnapshot = {
  activeRequest: AutoWidthMeasurementRequest | null;
  isActiveHost: boolean;
  shouldMountModal: boolean;
};

type HostListener = (snapshot: HostSnapshot) => void;

const hostListeners = new Map<number, HostListener>();
const cachedWidths = new Map<string, number>();
const pendingRequestsBySignature = new Map<
  string,
  AutoWidthMeasurementRequest
>();
const pendingQueue: AutoWidthMeasurementRequest[] = [];

let nextHostId = 1;
let nextRequestId = 1;
let activeHostId: number | null = null;
let activeRequest: AutoWidthMeasurementRequest | null = null;
let didActivateSharedModal = false;

const OFFSCREEN_MEASUREMENT_STYLE: ViewStyle = {
  left: -10000,
  position: 'absolute',
  top: 0,
};

const getFirstRegisteredHostId = () => {
  const iterator = hostListeners.keys().next();

  return iterator.done === true ? null : iterator.value;
};

const readCachedWidth = (signature: string) => {
  if (cachedWidths.has(signature) !== true) {
    return null;
  }

  const cachedWidth = cachedWidths.get(signature);

  if (typeof cachedWidth !== 'number') {
    return null;
  }

  cachedWidths.delete(signature);
  cachedWidths.set(signature, cachedWidth);

  return cachedWidth;
};

const writeCachedWidth = (signature: string, width: number) => {
  if (cachedWidths.has(signature) === true) {
    cachedWidths.delete(signature);
  }

  cachedWidths.set(signature, width);

  while (cachedWidths.size > MAX_CACHED_WIDTHS) {
    const oldestSignature = cachedWidths.keys().next().value;

    if (typeof oldestSignature !== 'string') {
      break;
    }

    cachedWidths.delete(oldestSignature);
  }
};

const getSnapshotForHost = (hostId: number): HostSnapshot => ({
  activeRequest: activeHostId === hostId ? activeRequest : null,
  isActiveHost: activeHostId === hostId,
  shouldMountModal: didActivateSharedModal === true && activeHostId === hostId,
});

const notifyHosts = () => {
  hostListeners.forEach((listener, hostId) => {
    listener(getSnapshotForHost(hostId));
  });
};

const processPendingQueue = () => {
  if (
    activeRequest !== null ||
    activeHostId === null ||
    pendingQueue.length === 0
  ) {
    notifyHosts();
    return;
  }

  activeRequest = pendingQueue.shift() ?? null;

  if (activeRequest !== null) {
    didActivateSharedModal = true;
  }

  notifyHosts();
};

const registerMeasurementHost = (hostId: number, listener: HostListener) => {
  hostListeners.set(hostId, listener);

  if (activeHostId === null) {
    activeHostId = hostId;
  }

  notifyHosts();
  processPendingQueue();

  return () => {
    hostListeners.delete(hostId);

    if (activeHostId === hostId) {
      activeHostId = getFirstRegisteredHostId();
    }

    if (hostListeners.size === 0) {
      activeHostId = null;
      didActivateSharedModal = false;
    }

    notifyHosts();
    processPendingQueue();
  };
};

export const getAutoWidthMeasurementSignature = ({
  borderWidth,
  paddingHorizontal,
  text,
  textFontFamily,
  textSize,
}: {
  borderWidth: number;
  paddingHorizontal: number;
  text: string;
  textFontFamily?: string;
  textSize?: number;
}) =>
  [
    text,
    textFontFamily ?? '',
    textSize ?? '',
    'bold',
    borderWidth,
    paddingHorizontal,
  ].join('|');

export const requestAutoWidthMeasurement = (
  input: AutoWidthMeasurementRequestInput
) =>
  new Promise<number>((resolve) => {
    const cachedWidth = readCachedWidth(input.signature);

    if (cachedWidth !== null) {
      resolve(cachedWidth);
      return;
    }

    const existingRequest = pendingRequestsBySignature.get(input.signature);

    if (existingRequest !== undefined) {
      existingRequest.resolvers.push(resolve);
      return;
    }

    const nextRequest = {
      id: nextRequestId,
      input,
      resolvers: [resolve],
    };

    nextRequestId += 1;
    pendingRequestsBySignature.set(input.signature, nextRequest);
    pendingQueue.push(nextRequest);
    processPendingQueue();
  });

const resolveActiveMeasurement = (requestId: number, width: number) => {
  if (activeRequest === null || activeRequest.id !== requestId) {
    return;
  }

  const nextWidth = Math.ceil(width);
  const completedRequest = activeRequest;

  activeRequest = null;
  pendingRequestsBySignature.delete(completedRequest.input.signature);
  writeCachedWidth(completedRequest.input.signature, nextWidth);
  completedRequest.resolvers.forEach((resolver) => resolver(nextWidth));
  notifyHosts();
  processPendingQueue();
};

export const getHiddenMeasurementTextStyle = ({
  textColor,
  textFontFamily,
  textLineHeight,
  textSize,
}: {
  textColor?: string;
  textFontFamily?: string;
  textLineHeight?: number;
  textSize?: number;
}): StyleProp<TextStyle> => ({
  color: textColor,
  fontFamily: textFontFamily,
  fontSize: textSize,
  fontWeight: 'bold',
  lineHeight: textLineHeight,
  textAlign: 'center',
});

export const getHiddenMeasurementContainerStyle = ({
  borderWidth,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
}: {
  borderWidth: number;
  paddingBottom: number;
  paddingHorizontal: number;
  paddingTop: number;
}): StyleProp<ViewStyle> => ({
  alignSelf: 'flex-start',
  borderWidth,
  flexDirection: 'row',
  opacity: 0,
  paddingBottom,
  paddingHorizontal,
  paddingTop,
});

export const SharedAutoWidthMeasurementHost = ({
  enabled,
}: {
  enabled: boolean;
}) => {
  const hostIdRef = useRef<number | null>(null);

  if (hostIdRef.current === null) {
    hostIdRef.current = nextHostId;
    nextHostId += 1;
  }

  const hostId = hostIdRef.current;
  const [snapshot, setSnapshot] = useState<HostSnapshot>(() =>
    getSnapshotForHost(hostId)
  );

  useEffect(() => {
    if (enabled !== true) {
      setSnapshot(getSnapshotForHost(hostId));
      return undefined;
    }

    return registerMeasurementHost(hostId, setSnapshot);
  }, [enabled, hostId]);

  const activeRequestInput = snapshot.activeRequest?.input ?? null;

  if (
    enabled !== true ||
    snapshot.shouldMountModal !== true ||
    activeRequestInput === null
  ) {
    return null;
  }

  return (
    <Modal
      visible
      transparent
      animationType="none"
      onRequestClose={() => undefined}
    >
      <View testID="aws-btn-hidden-measure-host" pointerEvents="none">
        <View
          key={`aws-btn-hidden-measure-${snapshot.activeRequest?.id ?? 0}`}
          testID="aws-btn-hidden-measure"
          pointerEvents="none"
          style={[
            getHiddenMeasurementContainerStyle(activeRequestInput),
            OFFSCREEN_MEASUREMENT_STYLE,
          ]}
          onLayout={(event: LayoutChangeEvent) => {
            resolveActiveMeasurement(
              snapshot.activeRequest?.id ?? 0,
              event.nativeEvent.layout.width
            );
          }}
        >
          <Text
            testID="aws-btn-hidden-measure-text"
            numberOfLines={1}
            ellipsizeMode="clip"
            style={getHiddenMeasurementTextStyle(activeRequestInput)}
          >
            {activeRequestInput.text}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export const __autoWidthMeasurementTesting = {
  getState: () => ({
    activeHostId,
    activeRequestId: activeRequest?.id ?? null,
    cacheSize: cachedWidths.size,
    didActivateSharedModal,
    hostCount: hostListeners.size,
    pendingCount: pendingQueue.length,
  }),
  resolveActiveMeasurement: (width: number) => {
    if (activeRequest === null) {
      return false;
    }

    resolveActiveMeasurement(activeRequest.id, width);
    return true;
  },
  reset: () => {
    hostListeners.clear();
    cachedWidths.clear();
    pendingRequestsBySignature.clear();
    pendingQueue.splice(0, pendingQueue.length);
    nextHostId = 1;
    nextRequestId = 1;
    activeHostId = null;
    activeRequest = null;
    didActivateSharedModal = false;
  },
};
