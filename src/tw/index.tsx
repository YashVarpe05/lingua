import {
  useCssElement,
  useNativeVariable as useFunctionalVariable,
} from "react-native-css";

import { Link as RouterLink } from "expo-router";
import Animated from "react-native-reanimated";
import React from "react";
import {
  View as RNView,
  Text as RNText,
  Pressable as RNPressable,
  ScrollView as RNScrollView,
  TouchableHighlight as RNTouchableHighlight,
  TextInput as RNTextInput,
  StyleSheet,
} from "react-native";

// ─── CSS-enabled Link ────────────────────────────────────────────────
export const Link = (
  props: React.ComponentProps<typeof RouterLink> & { className?: string }
) => {
  return useCssElement(RouterLink as any, props as any, { className: "style" }) as any;
};

Link.Trigger = RouterLink.Trigger;
Link.Menu = RouterLink.Menu;
Link.MenuAction = RouterLink.MenuAction;
Link.Preview = RouterLink.Preview;

// ─── CSS Variable hook ──────────────────────────────────────────────
export const useCSSVariable =
  process.env.EXPO_OS !== "web"
    ? useFunctionalVariable
    : (variable: string) => `var(${variable})`;

// ─── View ────────────────────────────────────────────────────────────
export type ViewProps = React.ComponentProps<typeof RNView> & {
  className?: string;
};

export const View = (props: ViewProps) => {
  return useCssElement(RNView as any, props as any, { className: "style" }) as any;
};
View.displayName = "CSS(View)";

// ─── Text ────────────────────────────────────────────────────────────
export const Text = (
  props: React.ComponentProps<typeof RNText> & { className?: string }
) => {
  return useCssElement(RNText as any, props as any, { className: "style" }) as any;
};
Text.displayName = "CSS(Text)";

// ─── ScrollView ──────────────────────────────────────────────────────
export const ScrollView = (
  props: React.ComponentProps<typeof RNScrollView> & {
    className?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(RNScrollView as any, props as any, {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  }) as any;
};
ScrollView.displayName = "CSS(ScrollView)";

// ─── Pressable ───────────────────────────────────────────────────────
export const Pressable = (
  props: React.ComponentProps<typeof RNPressable> & { className?: string }
) => {
  return useCssElement(RNPressable as any, props as any, { className: "style" }) as any;
};
Pressable.displayName = "CSS(Pressable)";

// ─── TextInput ───────────────────────────────────────────────────────
export const TextInput = (
  props: React.ComponentProps<typeof RNTextInput> & { className?: string }
) => {
  return useCssElement(RNTextInput as any, props as any, { className: "style" }) as any;
};
TextInput.displayName = "CSS(TextInput)";

// ─── AnimatedScrollView ──────────────────────────────────────────────
export const AnimatedScrollView = (
  props: React.ComponentProps<typeof Animated.ScrollView> & {
    className?: string;
    contentClassName?: string;
    contentContainerClassName?: string;
  }
) => {
  return useCssElement(Animated.ScrollView as any, props as any, {
    className: "style",
    contentClassName: "contentContainerStyle",
    contentContainerClassName: "contentContainerStyle",
  }) as any;
};

// ─── TouchableHighlight ──────────────────────────────────────────────
function XXTouchableHighlight(
  props: React.ComponentProps<typeof RNTouchableHighlight>
) {
  const { underlayColor, ...style } = (StyleSheet.flatten(props.style) || {}) as any;
  return (
    <RNTouchableHighlight
      underlayColor={underlayColor}
      {...props}
      style={style}
    />
  );
}

export const TouchableHighlight = (
  props: React.ComponentProps<typeof RNTouchableHighlight>
) => {
  return useCssElement(XXTouchableHighlight as any, props as any, { className: "style" }) as any;
};
TouchableHighlight.displayName = "CSS(TouchableHighlight)";
