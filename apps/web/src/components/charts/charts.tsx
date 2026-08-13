'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReactNode } from 'react';
import { formatCompact, formatDateShort, formatNumber, formatPercent } from '../../lib/utils';

const AXIS = {
  stroke: 'hsl(var(--content-muted) / 0.5)',
  fontSize: 11,
};

const GRID = 'hsl(var(--border))';

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  formatter?: (value: number, key: string) => string;
  labelFormatter?: (label: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass min-w-36 rounded-xl px-3 py-2 shadow-lifted">
      <p className="mb-1.5 text-[0.7rem] font-medium text-content-muted">
        {labelFormatter ? labelFormatter(String(label ?? '')) : String(label ?? '')}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-content-secondary">
              <span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}
            </span>
            <span className="tabular font-medium text-content">
              {formatter
                ? formatter(Number(entry.value ?? 0), String(entry.dataKey ?? ''))
                : formatNumber(Number(entry.value ?? 0))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartShell({ height = 260, children }: { height?: number; children: ReactNode }) {
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children as never}
      </ResponsiveContainer>
    </div>
  );
}

// ── Davomat dinamikasi ───────────────────────────────────────

export function AttendanceTrendChart({
  data,
  height = 260,
  labels,
}: {
  data: Array<{ date: string; present: number; total: number; rate: number }>;
  height?: number;
  labels: { present: string; rate: string };
}) {
  return (
    <ChartShell height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-attendance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
          {...AXIS}
        />
        <YAxis
          domain={[0, 100]}
          tickFormatter={(value: number) => `${value}%`}
          tickLine={false}
          axisLine={false}
          width={44}
          {...AXIS}
        />
        <Tooltip
          content={
            <ChartTooltip
              labelFormatter={formatDateShort}
              formatter={(value, key) =>
                key === 'rate' ? formatPercent(value) : formatNumber(value)
              }
            />
          }
        />
        <Area
          type="monotone"
          dataKey="rate"
          name={labels.rate}
          stroke="hsl(var(--chart-1))"
          strokeWidth={2.5}
          fill="url(#grad-attendance)"
          activeDot={{ r: 4, strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartShell>
  );
}

// ── Daromad / xarajat ────────────────────────────────────────

export function CashflowChart({
  data,
  height = 280,
  labels,
}: {
  data: Array<{ date: string; income: number; expense: number; profit: number }>;
  height?: number;
  labels: { income: string; expense: string; profit: string };
}) {
  return (
    <ChartShell height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={GRID} strokeDasharray="4 4" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateShort}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          {...AXIS}
        />
        <YAxis
          tickFormatter={formatCompact}
          tickLine={false}
          axisLine={false}
          width={52}
          {...AXIS}
        />
        <Tooltip
          cursor={{ fill: 'hsl(var(--content-muted) / 0.06)' }}
          content={<ChartTooltip labelFormatter={formatDateShort} formatter={formatCompact} />}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--content-muted))' }}
        />
        <Bar dataKey="income" name={labels.income} fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="expense"
          name={labels.expense}
          fill="hsl(var(--chart-6))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ChartShell>
  );
}

// ── Kategoriyalar bo'yicha halqa diagramma ───────────────────

const DONUT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--chart-6))',
  'hsl(var(--content-muted))',
];

export function CategoryDonut({
  data,
  height = 260,
  centerLabel,
  centerValue,
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
  centerLabel?: string;
  centerValue?: string;
}) {
  return (
    <div className="relative">
      <ChartShell height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={formatCompact} />} />
        </PieChart>
      </ChartShell>
      {centerValue ? (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular text-lg font-semibold text-content">{centerValue}</span>
          {centerLabel ? (
            <span className="text-[0.7rem] text-content-muted">{centerLabel}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ── Reja vs fakt / filiallarni taqqoslash ────────────────────

export function ComparisonChart({
  data,
  height = 280,
  labels,
  horizontal = false,
}: {
  data: Array<{ name: string; plan: number; fact: number }>;
  height?: number;
  labels: { plan: string; fact: string };
  horizontal?: boolean;
}) {
  return (
    <ChartShell height={height}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 12, left: horizontal ? 8 : -8, bottom: 0 }}
        barGap={2}
      >
        <CartesianGrid stroke={GRID} strokeDasharray="4 4" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" tickFormatter={formatCompact} tickLine={false} axisLine={false} {...AXIS} />
            <YAxis type="category" dataKey="name" width={104} tickLine={false} axisLine={false} {...AXIS} />
          </>
        ) : (
          <>
            <XAxis dataKey="name" tickLine={false} axisLine={false} {...AXIS} />
            <YAxis tickFormatter={formatCompact} tickLine={false} axisLine={false} width={52} {...AXIS} />
          </>
        )}
        <Tooltip
          cursor={{ fill: 'hsl(var(--content-muted) / 0.06)' }}
          content={<ChartTooltip formatter={formatCompact} />}
        />
        <Legend
          verticalAlign="top"
          height={28}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: 'hsl(var(--content-muted))' }}
        />
        <Bar dataKey="plan" name={labels.plan} fill="hsl(var(--chart-5))" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
        <Bar dataKey="fact" name={labels.fact} fill="hsl(var(--chart-1))" radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
      </BarChart>
    </ChartShell>
  );
}

/** Karta ichidagi kichik trend chizig'i. */
export function Sparkline({
  data,
  tone = 'brand',
  height = 44,
}: {
  data: Array<{ value: number }>;
  tone?: 'brand' | 'success' | 'danger' | 'warning';
  height?: number;
}) {
  const color =
    tone === 'success'
      ? 'hsl(var(--chart-3))'
      : tone === 'danger'
        ? 'hsl(var(--chart-6))'
        : tone === 'warning'
          ? 'hsl(var(--chart-4))'
          : 'hsl(var(--chart-1))';

  return (
    <ChartShell height={height}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.75}
          fill={`url(#spark-${tone})`}
          dot={false}
        />
      </AreaChart>
    </ChartShell>
  );
}
