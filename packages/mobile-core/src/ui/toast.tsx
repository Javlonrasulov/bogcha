import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fontForWeight, spacing } from '../theme/tokens';

export type ToastKind = 'error' | 'success' | 'info';

type IonName = ComponentProps<typeof Ionicons>['name'];

type ToastItem = {
  id: number;
  message: string;
  kind: ToastKind;
  visible: boolean;
};

type Listener = (item: Omit<ToastItem, 'visible'>) => void;

const listeners = new Set<Listener>();
let seq = 0;

/** Lider Manager Toast — ENTER 280 / HOLD 2600 / EXIT 320. */
export const TOAST_ENTER_MS = 280;
export const TOAST_HOLD_MS = 2600;
export const TOAST_EXIT_MS = 320;

/** Agent/Manager APK snackbar uslubidagi ogohlantirish. */
export function showToast(message: string, kind: ToastKind = 'error') {
  const text = message.trim();
  if (!text) return;
  seq += 1;
  const item = { id: seq, message: text, kind };
  listeners.forEach((fn) => fn(item));
}

const KIND_STYLE: Record<
  ToastKind,
  { bg: string; border: string; iconBg: string; color: string; icon: IonName }
> = {
  error: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(244, 67, 54, 0.35)',
    iconBg: 'rgba(244, 67, 54, 0.18)',
    color: '#FFCDD2',
    icon: 'alert-circle',
  },
  success: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(0, 200, 83, 0.35)',
    iconBg: 'rgba(0, 200, 83, 0.18)',
    color: '#C8E6C9',
    icon: 'checkmark-circle',
  },
  info: {
    bg: 'rgba(28, 25, 35, 0.94)',
    border: 'rgba(37, 99, 235, 0.40)',
    iconBg: 'rgba(37, 99, 235, 0.20)',
    color: '#BFDBFE',
    icon: 'information-circle',
  },
};

function ToastCard({
  item,
  onPress,
}: {
  item: ToastItem;
  onPress?: () => void;
}) {
  const s = KIND_STYLE[item.kind];
  const anim = useRef(new Animated.Value(item.visible ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: item.visible ? 1 : 0,
      duration: item.visible ? TOAST_ENTER_MS : TOAST_EXIT_MS,
      useNativeDriver: true,
    }).start();
  }, [anim, item.visible]);

  const shell = (
    <Animated.View
      style={{
        width: '100%',
        maxWidth: 420,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: s.bg,
        borderWidth: StyleSheet.hairlineWidth * 2,
        borderColor: s.border,
        shadowColor: '#000',
        shadowOpacity: 0.28,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 10 },
        elevation: 10,
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [-18, 0],
            }),
          },
        ],
      }}
      accessibilityRole="text"
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          backgroundColor: s.iconBg,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Ionicons name={s.icon} size={18} color={s.color} />
      </View>
      <Text
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          fontWeight: '600',
          fontFamily: fontForWeight('600'),
          lineHeight: 19,
          letterSpacing: 0.2,
          color: s.color,
        }}
        numberOfLines={3}
      >
        {item.message}
      </Text>
    </Animated.View>
  );

  if (!onPress) return shell;

  return (
    <Pressable onPress={onPress} style={{ width: '100%', maxWidth: 420 }}>
      {shell}
    </Pressable>
  );
}

/** Global toast host — AppProviders ichida bir marta. */
export function ToastHost({
  style,
  onToastPress,
}: {
  style?: StyleProp<ViewStyle>;
  onToastPress?: (item: { id: number; message: string; kind: ToastKind }) => void;
} = {}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>[]>>(new Map());

  useEffect(() => {
    const onPush: Listener = (item) => {
      setItems((prev) => [...prev, { ...item, visible: true }].slice(-3));

      const hide = setTimeout(() => {
        setItems((prev) => prev.map((t) => (t.id === item.id ? { ...t, visible: false } : t)));
      }, TOAST_HOLD_MS);

      const remove = setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== item.id));
        timers.current.delete(item.id);
      }, TOAST_HOLD_MS + TOAST_EXIT_MS + 40);

      timers.current.set(item.id, [hide, remove]);
    };

    listeners.add(onPush);
    return () => {
      listeners.delete(onPush);
      timers.current.forEach((list) => list.forEach(clearTimeout));
      timers.current.clear();
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          zIndex: 9999,
          elevation: 9999,
          alignItems: 'center',
          gap: 8,
          paddingTop: insets.top + 12,
          paddingHorizontal: spacing.lg,
        },
        style,
      ]}
    >
      {items.map((item) => (
        <ToastCard
          key={item.id}
          item={item}
          onPress={
            onToastPress
              ? () => onToastPress({ id: item.id, message: item.message, kind: item.kind })
              : undefined
          }
        />
      ))}
    </View>
  );
}

/** Ixtiyoriy: hostni children bilan o‘rash. */
export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1 }}>
      {children}
      <ToastHost />
    </View>
  );
}
