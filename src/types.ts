import type { ReactNode } from 'react';
import type {
  ColorValue,
  GestureResponderEvent,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

/**
 * Maps normalized animation progress to eased progress.
 *
 * @public
 */
export type AwesomeButtonAnimationCurve = (value: number) => number;

/**
 * Canonical visual and motion overrides for an Awesome Button face.
 *
 * @public
 */
export interface AwesomeButtonStyle {
  /** Idle face background color. */
  backgroundColor?: ColorValue;
  /** Pressed face background color. */
  backgroundActive?: ColorValue;
  /** Placeholder face background color. */
  backgroundPlaceholder?: ColorValue;
  /** Progress face background color. */
  backgroundProgress?: ColorValue;
  /** Color of the visible lower depth layer. */
  depthColor?: ColorValue;
  /** Color of the outer shadow layer. */
  shadowColor?: ColorValue;
  /** Color of the progress activity indicator. */
  activityColor?: ColorValue;
  /** Optional overlay color shown while pressed. */
  pressedOverlayColor?: ColorValue;
  /** Foreground color used by text content. */
  foregroundColor?: ColorValue;
  /** Face background color while disabled. */
  disabledBackgroundColor?: ColorValue;
  /** Depth-layer color while disabled. */
  disabledDepthColor?: ColorValue;
  /** Shadow color while disabled. */
  disabledShadowColor?: ColorValue;
  /** Foreground color while disabled. */
  disabledForegroundColor?: ColorValue;
  /** Border color while disabled. */
  disabledBorderColor?: ColorValue;
  /** Opacity applied to the pressed face. */
  activeOpacity?: number;
  /** Label font size in density-independent pixels. */
  textSize?: number;
  /** Label line height in density-independent pixels. */
  textLineHeight?: number;
  /** Label font-family name. */
  textFontFamily?: string;
  /** Radius applied to every corner unless a physical-corner override is set. */
  borderRadius?: number;
  /** Physical top-left corner radius. */
  borderTopLeftRadius?: number;
  /** Physical top-right corner radius. */
  borderTopRightRadius?: number;
  /** Physical bottom-left corner radius. */
  borderBottomLeftRadius?: number;
  /** Physical bottom-right corner radius. */
  borderBottomRightRadius?: number;
  /** Border width in density-independent pixels. */
  borderWidth?: number;
  /** Border color. */
  borderColor?: ColorValue;
  /** Horizontal content padding in density-independent pixels. */
  paddingHorizontal?: number;
  /** Top content padding in density-independent pixels. */
  paddingTop?: number;
  /** Bottom content padding in density-independent pixels. */
  paddingBottom?: number;
  /** Height of the visible depth layer in density-independent pixels. */
  raiseAmount?: number;
  /** Spacing between auxiliary slots and the label in density-independent pixels. */
  contentGap?: number;
  /** General style-transition duration in milliseconds. */
  animationDuration?: number;
  /** Press-down transition duration in milliseconds. */
  pressInAnimationDuration?: number;
  /** Easing curve used for timing-based visual transitions. */
  animationCurve?: AwesomeButtonAnimationCurve;
}

/**
 * Function supplied to `onPress` for completing an accepted progress handle.
 *
 * @public
 */
export type ProgressCompletionHandler = (callback?: () => void) => void;

/**
 * Callback dispatched for an accepted activation.
 *
 * @public
 */
export type AwesomeButtonOnPress = (next?: ProgressCompletionHandler) => void;

/**
 * Native Pressable props that may be forwarded without replacing owned interactions.
 *
 * @public
 */
export type AwesomeButtonPressableProps = Omit<
  PressableProps,
  'children' | 'onLongPress' | 'onPress' | 'onPressIn' | 'onPressOut'
>;

/**
 * Explicit width, intrinsic-width request, or legacy null width.
 *
 * @public
 */
export type ButtonWidth = number | 'auto' | null;

/**
 * Public configuration and event callbacks for the core Awesome Button.
 *
 * @public
 */
export interface AwesomeButtonProps {
  /** Legacy activity-indicator color override. @deprecated Move this override into `buttonStyle.activityColor`. */
  activityColor?: string;
  /** Legacy pressed-opacity override. @deprecated Move this override into `buttonStyle.activeOpacity`. */
  activeOpacity?: number;
  /** Whether placeholder entry and exit may animate. */
  animatedPlaceholder?: boolean;
  /** Whether content-driven size changes may animate. */
  animateSize?: boolean;
  /** Legacy pressed-background override. @deprecated Move this override into `buttonStyle.backgroundActive`. */
  backgroundActive?: string;
  /** Legacy idle-background override. @deprecated Move this override into `buttonStyle.backgroundColor`. */
  backgroundColor?: string;
  /** Legacy depth-color override. @deprecated Use `buttonStyle.depthColor`. */
  backgroundDarker?: string;
  /** Legacy placeholder-background override. @deprecated Move this override into `buttonStyle.backgroundPlaceholder`. */
  backgroundPlaceholder?: string;
  /** Legacy progress-background override. @deprecated Move this override into `buttonStyle.backgroundProgress`. */
  backgroundProgress?: string;
  /** Legacy shadow-color override. @deprecated Use `buttonStyle.shadowColor`. */
  backgroundShadow?: string;
  /** Legacy border-color override. @deprecated Move this override into `buttonStyle.borderColor`. */
  borderColor?: string;
  /** Legacy all-corner radius override. @deprecated Move this override into `buttonStyle.borderRadius`. */
  borderRadius?: number;
  /** Legacy bottom-left radius override. @deprecated Move this override into `buttonStyle.borderBottomLeftRadius`. */
  borderBottomLeftRadius?: number;
  /** Legacy bottom-right radius override. @deprecated Move this override into `buttonStyle.borderBottomRightRadius`. */
  borderBottomRightRadius?: number;
  /** Legacy top-left radius override. @deprecated Move this override into `buttonStyle.borderTopLeftRadius`. */
  borderTopLeftRadius?: number;
  /** Legacy top-right radius override. @deprecated Move this override into `buttonStyle.borderTopRightRadius`. */
  borderTopRightRadius?: number;
  /** Minimum interval between accepted activations in milliseconds. */
  debouncedPressTime?: number;
  /** Legacy misspelled bottom-left radius override. @deprecated Use `buttonStyle.borderBottomLeftRadius`. */
  borderLeftBottomRadius?: number;
  /** Legacy border-width override. @deprecated Move this override into `buttonStyle.borderWidth`. */
  borderWidth?: number;
  /** Delay before automatic progress completion in milliseconds. */
  progressLoadingTime?: number;
  /** Whether busy state renders the animated progress layer. */
  showProgressBar?: boolean;
  /** Overlay slot that does not participate in intrinsic-width measurement. */
  extra?: ReactNode;
  /** Whether activation and pointer ownership are disabled. */
  disabled?: boolean;
  /** Canonical visual overrides. This bridge is planned to become `style` in a future major. */
  buttonStyle?: AwesomeButtonStyle;
  /** Outer layout style. Takes precedence over the legacy outer `style`. */
  containerStyle?: StyleProp<ViewStyle>;
  /** Canonical moving-face height. Takes precedence over legacy `height`. */
  faceHeight?: number;
  /**
   * Legacy geometry-height override.
   *
   * @deprecated Use `faceHeight` until the next major makes `height` canonical
   * face height.
   */
  height?: number;
  /** Native Pressable hit-target expansion. */
  hitSlop?: PressableProps['hitSlop'];
  /** Legacy horizontal-padding override. @deprecated Move this override into `buttonStyle.paddingHorizontal`. */
  paddingHorizontal?: number;
  /** Legacy top-padding override. @deprecated Move this override into `buttonStyle.paddingTop`. */
  paddingTop?: number;
  /** Whether the button is externally controlled in busy state. */
  progress?: boolean;
  /** Content rendered before the primary label. */
  before?: ReactNode;
  /** Additional safe native Pressable props. */
  dangerouslySetPressableProps?: AwesomeButtonPressableProps;
  /** Content rendered after the primary label. */
  after?: ReactNode;
  /** Legacy bottom-padding override. @deprecated Move this override into `buttonStyle.paddingBottom`. */
  paddingBottom?: number;
  /** Legacy depth-height override. @deprecated Use `buttonStyle.raiseAmount`. */
  raiseLevel?: number;
  /** Legacy release-mode switch. @deprecated Release is planned to use the native spring unconditionally in a future major. */
  springRelease?: boolean;
  /** Whether the outer container fills the available horizontal space. */
  stretch?: boolean;
  /**
   * Legacy outer-container style.
   *
   * @deprecated Use `containerStyle`.
   */
  style?: StyleProp<ViewStyle>;
  /** Legacy font-family override. @deprecated Move this override into `buttonStyle.textFontFamily`. */
  textFontFamily?: string;
  /** Legacy foreground-color override. @deprecated Use `buttonStyle.foregroundColor`. */
  textColor?: string;
  /** Legacy line-height override. @deprecated Move this override into `buttonStyle.textLineHeight`. */
  textLineHeight?: number;
  /** Legacy font-size override. @deprecated Move this override into `buttonStyle.textSize`. */
  textSize?: number;
  /** Whether compatible label replacements use a staggered text transition. */
  textTransition?: boolean;
  /** Requested button width in density-independent pixels or intrinsic mode. */
  width?: ButtonWidth;
  /** Primary button content. */
  children?: ReactNode;
  /** Activation callback, optionally receiving a one-shot progress completion handle. */
  onPress?: AwesomeButtonOnPress;
  /**
   * Legacy physical-only long-press callback with the native event.
   *
   * @deprecated Use `onLongPressAction`. This callback remains physical-only
   * because its real `GestureResponderEvent` cannot be fabricated safely.
   */
  onLongPress?: PressableProps['onLongPress'];
  /** Accessible and physical long-press action without a synthetic event. */
  onLongPressAction?: () => void;
  /** Accessible name announced for the button. */
  accessibilityLabel?: string;
  /** Optional accessibility hint describing the activation result. */
  accessibilityHint?: string;
  /** Localized accessibility action name for long press. */
  accessibilityLongPressLabel?: string;
  /** Native press-in callback dispatched at physical pointer entry. */
  onPressIn?: (event: GestureResponderEvent) => void;
  /** Native press-out callback dispatched after terminal ownership is claimed. */
  onPressOut?: (event: GestureResponderEvent) => void;
  /** Logical callback dispatched synchronously after pressed state is committed. */
  onPressedIn?: () => void;
  /** Logical callback dispatched when the release transition settles. */
  onPressedOut?: () => void;
  /** Callback dispatched when accepted progress begins. */
  onProgressStart?: () => void;
  /** Callback dispatched when accepted progress completion settles. */
  onProgressEnd?: () => void;
}

/**
 * Identifier of a built-in visual theme.
 *
 * @public
 */
export type ThemeName =
  | 'basic'
  | 'bojack'
  | 'cartman'
  | 'mysterion'
  | 'c137'
  | 'rick'
  | 'summer'
  | 'bruce';

/**
 * Core semantic button variant supported by every built-in theme.
 *
 * @public
 */
export type CoreButtonVariant =
  | 'primary'
  | 'secondary'
  | 'anchor'
  | 'danger'
  | 'disabled'
  | 'flat';

/**
 * Legacy social button variants supported by built-in themes.
 *
 * @public
 */
export type SocialButtonVariant =
  | 'twitter'
  | 'messenger'
  | 'facebook'
  | 'github'
  | 'linkedin'
  | 'whatsapp'
  | 'reddit'
  | 'pinterest'
  | 'youtube';

/**
 * Closed legacy union of core and social theme variants.
 *
 * @public
 */
export type ButtonVariant = CoreButtonVariant | SocialButtonVariant;

/**
 * Request-only compatibility bridge. The legacy closed union stays unchanged.
 *
 * @public
 */
export type AwesomeButtonVariant = ButtonVariant | 'x';

/**
 * Named size preset exposed by the themed wrapper.
 *
 * @public
 */
export type ButtonSize = 'icon' | 'small' | 'medium' | 'large';

/**
 * Legacy theme button fields accepted by published theme definitions.
 *
 * @public
 */
export type ThemeButtonStyle = Pick<
  AwesomeButtonProps,
  | 'activityColor'
  | 'backgroundActive'
  | 'backgroundColor'
  | 'backgroundDarker'
  | 'backgroundPlaceholder'
  | 'backgroundProgress'
  | 'backgroundShadow'
  | 'borderColor'
  | 'borderRadius'
  | 'borderBottomLeftRadius'
  | 'borderBottomRightRadius'
  | 'borderTopLeftRadius'
  | 'borderTopRightRadius'
  | 'borderWidth'
  | 'height'
  | 'paddingBottom'
  | 'paddingHorizontal'
  | 'paddingTop'
  | 'raiseLevel'
  | 'textColor'
  | 'textFontFamily'
  | 'textLineHeight'
  | 'textSize'
  | 'width'
>;

/**
 * Geometry and typography values for one named theme size.
 *
 * @public
 */
export type ThemeSizeStyle = {
  /** Preset width in density-independent pixels. */
  width: number;
  /** Preset face height in density-independent pixels. */
  height: number;
  /** Optional preset font size in density-independent pixels. */
  textSize?: number;
  /** Optional preset horizontal padding in density-independent pixels. */
  paddingHorizontal?: number;
};

/**
 * Complete legacy style map for every legacy button variant.
 *
 * @public
 */
export type ThemeButtonDefinitions = Record<ButtonVariant, ThemeButtonStyle>;

/**
 * Theme style map that may additionally define the canonical `x` variant.
 *
 * @public
 */
export type AwesomeButtonThemeDefinitions = ThemeButtonDefinitions &
  Partial<Record<'x', ThemeButtonStyle>>;

/**
 * Complete size map for every named button size.
 *
 * @public
 */
export type ThemeSizeDefinitions = Record<ButtonSize, ThemeSizeStyle>;

/**
 * Legacy shape of an Awesome Button theme.
 *
 * @public
 */
export type ThemeDefinition = {
  /** Human-readable theme title. */
  title: string;
  /** Theme showcase background color. */
  background: string;
  /** Theme showcase foreground color. */
  color: string;
  /** Styles for every legacy button variant. */
  buttons: ThemeButtonDefinitions;
  /** Geometry and typography for every size preset. */
  size: ThemeSizeDefinitions;
};

/**
 * Theme definition that may provide the canonical `x` social variant.
 *
 * @public
 */
export type AwesomeButtonThemeDefinition = Omit<ThemeDefinition, 'buttons'> & {
  /** Styles for every legacy variant plus an optional canonical `x` style. */
  buttons: AwesomeButtonThemeDefinitions;
};

/**
 * Registered theme returned by `getTheme`, including canonical `x` support.
 *
 * @public
 */
export type AwesomeButtonRegisteredThemeDefinition = Omit<
  RegisteredThemeDefinition,
  'buttons'
> & {
  /** Styles for every legacy variant plus the canonical `x` style. */
  buttons: AwesomeButtonThemeDefinitions;
};

/**
 * Built-in theme definition with navigation metadata.
 *
 * @public
 */
export type RegisteredThemeDefinition = ThemeDefinition & {
  /** Stable built-in theme name. */
  name: ThemeName;
  /** Whether another registered theme follows this one. */
  next: boolean;
  /** Whether another registered theme precedes this one. */
  prev: boolean;
};

/**
 * Public configuration for the themed Awesome Button wrapper.
 *
 * @public
 */
export interface ThemedButtonProps extends AwesomeButtonProps {
  /** Custom theme definition used instead of a registered theme. */
  config?: AwesomeButtonThemeDefinition;
  /** Whether the wrapper requests intrinsic width when no explicit width is set. */
  autoWidth?: boolean;
  /** Whether the disabled-precedence flat variant is requested. */
  flat?: boolean;
  /** Optional registered-theme index. */
  index?: number | null;
  /** Optional registered-theme name. */
  name?: ThemeName | null;
  /** Named size preset. */
  size?: ButtonSize;
  /** Whether the themed face and depth colors are made transparent. */
  transparent?: boolean;
  /** Semantic or social theme variant. */
  type?: AwesomeButtonVariant;
}
