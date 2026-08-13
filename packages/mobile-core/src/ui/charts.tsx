import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Line as SvgLine,
} from 'react-native-svg';
import { useTheme } from '../theme/provider';
import { radius, spacing, toneColors, typeStyle, type ToneName } from '../theme/tokens';
import { AppText, Column, Row } from './primitives';

export interface ChartPoint {
  label: string;
  value: number;
}

export type ChartMode = 'wave' | 'bars';

type PlotPoint = { x: number; y: number; value: number; label: string };

/** Monoton cubic (Fritsch–Carlson) — silliq to‘lqin yo‘li. */
function buildSmoothPath(
  points: PlotPoint[],
  baselineY: number,
): { line: string; area: string } {
  if (points.length === 0) return { line: '', area: '' };
  if (points.length === 1) {
    const p = points[0]!;
    return {
      line: `M ${p.x} ${p.y}`,
      area: `M ${p.x} ${p.y} L ${p.x} ${baselineY} Z`,
    };
  }

  const n = points.length;
  const dx: number[] = [];
  const dy: number[] = [];
  const m: number[] = [];

  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1]!.x - points[i]!.x;
    dy[i] = points[i + 1]!.y - points[i]!.y;
    m[i] = dy[i]! / (dx[i] || 1);
  }

  const tangents = new Array<number>(n);
  tangents[0] = m[0]!;
  tangents[n - 1] = m[n - 2]!;
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1]! * m[i]! <= 0) tangents[i] = 0;
    else tangents[i] = (m[i - 1]! + m[i]!) / 2;
  }

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]!) < 1e-8) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
    } else {
      const a = tangents[i]! / m[i]!;
      const b = tangents[i + 1]! / m[i]!;
      const s = a * a + b * b;
      if (s > 9) {
        const t = 3 / Math.sqrt(s);
        tangents[i] = t * a * m[i]!;
        tangents[i + 1] = t * b * m[i]!;
      }
    }
  }

  let line = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    const h = dx[i]!;
    const c1x = p0.x + h / 3;
    const c1y = p0.y + (tangents[i]! * h) / 3;
    const c2x = p1.x - h / 3;
    const c2y = p1.y - (tangents[i + 1]! * h) / 3;
    line += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
  }

  const last = points[n - 1]!;
  const first = points[0]!;
  const area = `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

  return { line, area };
}

/**
 * Ustunli diagramma — tashqi kutubxonasiz, faqat View'lar orqali.
 * Ustun bosilganda qiymat ko‘rsatiladi.
 */
export function BarChart({
  data,
  height = 140,
  tone = 'brand',
  formatValue,
}: {
  data: readonly ChartPoint[];
  height?: number;
  tone?: ToneName;
  formatValue?: (value: number) => string;
}) {
  const { colors } = useTheme();
  const accent = toneColors(colors, tone);
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(...data.map((point) => point.value), 1);
  const active = selected != null ? data[selected] : null;

  return (
    <Column gap={spacing.sm}>
      {active ? (
        <AppText variant="caption" weight="800" style={{ color: accent.fg, textAlign: 'center' }}>
          {active.label}: {formatValue ? formatValue(active.value) : active.value}
        </AppText>
      ) : null}
      <Row align="flex-end" justify="space-between" gap={spacing.xs} style={{ height }}>
        {data.map((point, index) => {
          const ratio = point.value / max;
          const isActive = selected === index;
          return (
            <Pressable
              key={`${point.label}-${index}`}
              onPress={() => setSelected((prev) => (prev === index ? null : index))}
              accessibilityRole="button"
              accessibilityLabel={
                formatValue ? `${point.label}: ${formatValue(point.value)}` : `${point.label}`
              }
              style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}
            >
              <View
                style={{
                  height: Math.max(4, ratio * (height - 28)),
                  alignSelf: 'stretch',
                  borderTopLeftRadius: radius.sm,
                  borderTopRightRadius: radius.sm,
                  backgroundColor: accent.fg,
                  opacity: isActive ? 1 : 0.35 + ratio * 0.65,
                }}
              />
              <Text
                style={[{ color: colors.contentMuted, fontSize: 10 }, typeStyle('caption')]}
                numberOfLines={1}
              >
                {point.label}
              </Text>
            </Pressable>
          );
        })}
      </Row>
      {formatValue ? (
        <Row justify="space-between">
          <AppText variant="caption" tone="muted">
            0
          </AppText>
          <AppText variant="caption" tone="muted">
            {formatValue(max)}
          </AppText>
        </Row>
      ) : null}
    </Column>
  );
}

/**
 * To‘lqinli diagramma — silliq chiziq + yumshoq area (SVG).
 * Nuqta bosilganda qiymat tooltip ko‘rinadi.
 */
export function WaveChart({
  data,
  height = 160,
  tone = 'brand',
  formatValue,
}: {
  data: readonly ChartPoint[];
  height?: number;
  tone?: ToneName;
  formatValue?: (value: number) => string;
}) {
  const { colors, elevation } = useTheme();
  const accent = toneColors(colors, tone);
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);

  const padX = 8;
  const padTop = 12;
  const padBottom = 8;
  const plotH = height - 36;
  const hit = 22;

  const values = (data ?? []).map((p) => p.value);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  const span = Math.max(rawMax - rawMin, 1e-6);

  const plot = useMemo(() => {
    const series = data ?? [];
    if (width <= 0 || series.length === 0) return null;
    const innerW = Math.max(1, width - padX * 2);
    const bottomY = padTop + (plotH - padTop - padBottom);
    const points: PlotPoint[] = series.map((point, index) => {
      const x =
        series.length === 1 ? padX + innerW / 2 : padX + (index / (series.length - 1)) * innerW;
      const y = padTop + (1 - (point.value - rawMin) / span) * (plotH - padTop - padBottom);
      return { x, y, value: point.value, label: point.label };
    });
    const zeroY =
      rawMin < 0 && rawMax > 0
        ? padTop + (1 - (0 - rawMin) / span) * (plotH - padTop - padBottom)
        : null;
    const fillBase = zeroY ?? bottomY;
    const paths = buildSmoothPath(points, fillBase);
    return { points, paths, zeroY };
  }, [data, width, plotH, rawMin, rawMax, span]);

  const series = data ?? [];
  const labelIndexes =
    series.length <= 5
      ? series.map((_, i) => i)
      : [0, Math.floor((series.length - 1) / 2), series.length - 1];

  const onLayout = (e: LayoutChangeEvent) => {
    const next = Math.round(e.nativeEvent.layout.width);
    if (next > 0 && next !== width) setWidth(next);
  };

  const gradId = `wave-${tone}`;
  const active = selected != null && plot ? plot.points[selected] : null;
  const activeText = active
    ? `${active.label}: ${formatValue ? formatValue(active.value) : String(active.value)}`
    : null;

  return (
    <Column gap={spacing.sm}>
      <View style={{ height: plotH }} onLayout={onLayout}>
        {width > 0 && plot ? (
          <>
            <Svg width={width} height={plotH}>
              <Defs>
                <SvgLinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0%" stopColor={accent.fg} stopOpacity={0.28} />
                  <Stop offset="100%" stopColor={accent.fg} stopOpacity={0.02} />
                </SvgLinearGradient>
              </Defs>

              {[0.25, 0.5, 0.75].map((t) => {
                const y = padTop + t * (plotH - padTop - padBottom);
                return (
                  <SvgLine
                    key={t}
                    x1={padX}
                    x2={width - padX}
                    y1={y}
                    y2={y}
                    stroke={colors.line}
                    strokeWidth={1}
                    strokeDasharray="4 6"
                  />
                );
              })}

              {plot.zeroY != null ? (
                <SvgLine
                  x1={padX}
                  x2={width - padX}
                  y1={plot.zeroY}
                  y2={plot.zeroY}
                  stroke={colors.contentMuted}
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  opacity={0.7}
                />
              ) : null}

              <Path d={plot.paths.area} fill={`url(#${gradId})`} />
              <Path
                d={plot.paths.line}
                fill="none"
                stroke={accent.fg}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {active ? (
                <SvgLine
                  x1={active.x}
                  x2={active.x}
                  y1={padTop}
                  y2={plotH - padBottom}
                  stroke={accent.fg}
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  opacity={0.45}
                />
              ) : null}

              {plot.points.map((p, index) => {
                const isActive = selected === index;
                return (
                  <Circle
                    key={`${p.label}-${p.x}`}
                    cx={p.x}
                    cy={p.y}
                    r={isActive ? 6 : 3.5}
                    fill={isActive ? accent.fg : colors.surface}
                    stroke={accent.fg}
                    strokeWidth={2}
                  />
                );
              })}
            </Svg>

            {/* Katta bosish zonasi — nuqta ustida qiymat */}
            {plot.points.map((p, index) => (
              <Pressable
                key={`hit-${p.label}-${index}`}
                accessibilityRole="button"
                accessibilityLabel={
                  formatValue ? `${p.label}: ${formatValue(p.value)}` : `${p.label}: ${p.value}`
                }
                onPress={() => setSelected((prev) => (prev === index ? null : index))}
                hitSlop={6}
                style={{
                  position: 'absolute',
                  left: p.x - hit / 2,
                  top: p.y - hit / 2,
                  width: hit,
                  height: hit,
                  borderRadius: hit / 2,
                }}
              />
            ))}

            {active && activeText ? (
              <View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    left: Math.min(Math.max(8, active.x - 56), Math.max(8, width - 120)),
                    top: Math.max(4, active.y - 40),
                    minWidth: 88,
                    maxWidth: 140,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: radius.md,
                    backgroundColor: colors.content,
                    alignItems: 'center',
                  },
                  elevation.md,
                ]}
              >
                <Text
                  style={{
                    color: colors.contentInverse,
                    fontSize: 12,
                    fontWeight: '800',
                    textAlign: 'center',
                  }}
                  numberOfLines={2}
                >
                  {activeText}
                </Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <Row justify="space-between">
        {labelIndexes.map((i) => (
          <AppText key={`l-${series[i]!.label}-${i}`} variant="caption" tone="muted">
            {series[i]!.label}
          </AppText>
        ))}
      </Row>

      {formatValue ? (
        <Row justify="space-between">
          <AppText variant="caption" tone="muted">
            {formatValue(rawMin)}
          </AppText>
          <AppText variant="caption" tone="muted" weight="700" style={{ color: accent.fg }}>
            {formatValue(rawMax)}
          </AppText>
        </Row>
      ) : null}
    </Column>
  );
}

/** To‘lqin / ustun almashtirgich — default to‘lqin. */
export function ChartModeToggle({
  value,
  onChange,
  waveLabel,
  barsLabel,
}: {
  value: ChartMode;
  onChange: (mode: ChartMode) => void;
  waveLabel: string;
  barsLabel: string;
}) {
  const { colors } = useTheme();

  const options: Array<{ mode: ChartMode; icon: 'pulse-outline' | 'bar-chart-outline'; label: string }> =
    [
      { mode: 'wave', icon: 'pulse-outline', label: waveLabel },
      { mode: 'bars', icon: 'bar-chart-outline', label: barsLabel },
    ];

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surfaceMuted,
        borderRadius: radius.md,
        padding: 3,
        gap: 2,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.mode;
        return (
          <Pressable
            key={opt.mode}
            onPress={() => onChange(opt.mode)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={opt.label}
            style={{
              width: 34,
              height: 30,
              borderRadius: radius.sm,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: active ? colors.lineStrong : 'transparent',
            }}
          >
            <Ionicons
              name={opt.icon}
              size={16}
              color={active ? colors.brand : colors.contentMuted}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Reja va faktni yonma-yon ko'rsatadigan gorizontal diagramma (TZ §21).
 */
export function PlanFactBar({
  label,
  plan,
  fact,
  formatValue,
  invertTone = false,
}: {
  label: string;
  plan: number;
  fact: number;
  formatValue: (value: number) => string;
  /** Xarajatlarda faktning oshishi yomon; daromadda esa yaxshi. */
  invertTone?: boolean;
}) {
  const { colors } = useTheme();
  const max = Math.max(plan, fact, 1);
  const overBudget = fact > plan;
  const isBad = invertTone ? !overBudget : overBudget;
  const factTone = toneColors(colors, isBad ? 'danger' : 'success');
  const ratio = Math.min(100, (fact / Math.max(plan, 1)) * 100);

  return (
    <Column gap={spacing.sm}>
      <Row justify="space-between" align="center">
        <AppText variant="label" weight="600">
          {label}
        </AppText>
        <AppText variant="caption" tone={isBad ? 'danger' : 'success'} weight="700">
          {Math.round(ratio)}%
        </AppText>
      </Row>
      <View
        style={{
          height: 8,
          borderRadius: radius.pill,
          backgroundColor: colors.surfaceMuted,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${Math.min(100, (fact / max) * 100)}%`,
            borderRadius: radius.pill,
            backgroundColor: factTone.fg,
          }}
        />
      </View>
      <AppText variant="caption" tone="muted">
        {formatValue(fact)} / {formatValue(plan)}
      </AppText>
    </Column>
  );
}

/**
 * Doiraviy ko'rsatkich (davomat foizi kabi) — SVG'siz, ikki yarim doira orqali.
 */
export function RingStat({
  percent,
  size = 88,
  thickness = 8,
  label,
  tone,
}: {
  percent: number;
  size?: number;
  thickness?: number;
  label?: string;
  tone?: ToneName;
}) {
  const { colors } = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  const resolvedTone: ToneName =
    tone ?? (clamped >= 90 ? 'success' : clamped >= 75 ? 'warning' : 'danger');
  const accent = toneColors(colors, resolvedTone);

  return (
    <View style={{ alignItems: 'center', gap: spacing.xs }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: colors.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: thickness,
            borderColor: accent.fg,
            opacity: 0.25 + (clamped / 100) * 0.75,
          }}
        />
        <Text style={[{ color: accent.fg }, typeStyle('heading')]}>{Math.round(clamped)}%</Text>
      </View>
      {label ? (
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
      ) : null}
    </View>
  );
}
