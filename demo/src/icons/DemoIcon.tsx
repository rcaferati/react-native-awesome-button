import React from 'react';
import Svg, { Path } from 'react-native-svg';
import {
  FONT_AWESOME_ICON_DATA,
  type DemoIconName,
} from './fontAwesomeIconData';

type DemoIconProps = {
  name: DemoIconName;
  size: number;
  color: string;
};

export default function DemoIcon({ name, size, color }: DemoIconProps) {
  const icon = FONT_AWESOME_ICON_DATA[name];

  return (
    <Svg
      accessible={false}
      focusable={false}
      width={size}
      height={size}
      viewBox={`0 0 ${icon.width} ${icon.height}`}
      preserveAspectRatio="xMidYMid meet"
    >
      <Path d={icon.pathData} fill={color} />
    </Svg>
  );
}
