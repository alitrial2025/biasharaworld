"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { T } from "@/components/locale";
import { money } from "@/lib/data";

type TrendProps = {
  period: string;
  start: string;
  sales: number[];
  profit: number[] | null;
  expenses: number[] | null;
  primaryLabel?: string;
  primaryColor?: string;
};
const width = 720;
const height = 190;
const plot = { left: 58, right: 18, top: 16, bottom: 155 };
const compact = new Intl.NumberFormat("en-KE", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Every line and tooltip comes from the same recorded report as its totals. */
export function WorkspaceTrend({
  period,
  start,
  sales,
  profit,
  expenses,
  primaryLabel = "Sales",
  primaryColor = "var(--chart-sales)",
}: TrendProps) {
  const id = useId().replaceAll(":", "");
  const [active, setActive] = useState<number | null>(null);
  const [focused, setFocused] = useState(false);
  const series = [
    { name: primaryLabel, values: sales, color: primaryColor },
    ...(profit
      ? [
          {
            name: "Operating profit",
            values: profit,
            color: "var(--chart-profit)",
          },
        ]
      : []),
    ...(expenses
      ? [{ name: "Expenses", values: expenses, color: "var(--chart-expenses)" }]
      : []),
  ];
  const values = series.flatMap((s) => s.values);
  const low = Math.min(0, ...values);
  const high = Math.max(1, ...values);
  const step = 10 ** Math.floor(Math.log10(Math.max(1, high - low)));
  const maximum = Math.max(step, Math.ceil((high * 1.1) / step) * step);
  const minimum = Math.floor((low * 1.1) / step) * step;
  const x = (i: number) =>
    plot.left +
    (i / Math.max(1, sales.length - 1)) * (width - plot.left - plot.right);
  const y = (value: number) =>
    plot.bottom -
    ((value - minimum) / (maximum - minimum)) * (plot.bottom - plot.top);
  const index =
    active === null ? null : Math.min(active, Math.max(0, sales.length - 1));
  function date(i: number) {
    if (period === "Day") return `${String(i).padStart(2, "0")}:00`;
    return new Intl.DateTimeFormat("en-KE", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(Date.parse(start + "T00:00:00Z") + i * 86400000));
  }
  function inspect(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setActive((current) => {
      if (event.key === "Home") return 0;
      if (event.key === "End") return sales.length - 1;
      return Math.max(
        0,
        Math.min(
          sales.length - 1,
          (current ?? sales.length - 1) + (event.key === "ArrowRight" ? 1 : -1),
        ),
      );
    });
  }
  const description =
    index === null
      ? "Recorded business trends in KES. Use the left and right arrow keys to inspect each point, or open the chart data below."
      : `${date(index)}. ${series.map((s) => `${s.name}: KES ${money(s.values[index] ?? 0)}`).join(". ")}.`;
  const tickIndices = [
    ...new Set([
      0,
      Math.round((sales.length - 1) / 4),
      Math.round((sales.length - 1) / 2),
      Math.round(((sales.length - 1) * 3) / 4),
      sales.length - 1,
    ]),
  ];
  return (
    <div className="workspace-trend">
      <div
        className="trend-canvas"
        role="group"
        aria-label="Recorded business trends"
        aria-describedby={`trend-description-${id}`}
        tabIndex={0}
        onKeyDown={inspect}
        onFocus={() => {
          setFocused(true);
          setActive(sales.length - 1);
        }}
        onBlur={() => {
          setFocused(false);
          setActive(null);
        }}
        onPointerMove={(event) => {
          const box = event.currentTarget.getBoundingClientRect();
          const position = ((event.clientX - box.left) / box.width) * width;
          setActive(
            Math.max(
              0,
              Math.min(
                sales.length - 1,
                Math.round(
                  ((position - plot.left) / (width - plot.left - plot.right)) *
                    (sales.length - 1),
                ),
              ),
            ),
          );
        }}
        onPointerLeave={() => {
          if (!focused) setActive(null);
        }}
      >
        <span
          id={`trend-description-${id}`}
          className="sr-only"
          aria-live={focused ? "polite" : "off"}
        >
          {description}
        </span>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={`trend-area-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={primaryColor} stopOpacity=".2" />
              <stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const value = minimum + ((maximum - minimum) * i) / 4;
            return (
              <g key={i}>
                <line
                  x1={plot.left}
                  x2={width - plot.right}
                  y1={y(value)}
                  y2={y(value)}
                  className="trend-gridline"
                />
                <text
                  x={plot.left - 12}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="trend-axis"
                >
                  {compact.format(value)}
                </text>
              </g>
            );
          })}
          {tickIndices.map((i) => (
            <text
              key={i}
              x={x(i)}
              y={height - 9}
              textAnchor={
                i === 0 ? "start" : i === sales.length - 1 ? "end" : "middle"
              }
              className="trend-axis"
            >
              {date(i)}
            </text>
          ))}
          <polygon
            points={`${x(0)},${y(0)} ${sales.map((value, i) => `${x(i)},${y(value)}`).join(" ")} ${x(sales.length - 1)},${y(0)}`}
            fill={`url(#trend-area-${id})`}
          />
          {series.map((s) => (
            <polyline
              key={s.name}
              points={s.values
                .map((value, i) => `${x(i)},${y(value)}`)
                .join(" ")}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {index !== null && (
            <g>
              <line
                x1={x(index)}
                x2={x(index)}
                y1={plot.top}
                y2={plot.bottom}
                className="trend-crosshair"
              />
              {series.map((s) => (
                <circle
                  key={s.name}
                  cx={x(index)}
                  cy={y(s.values[index] ?? 0)}
                  r="4"
                  fill={s.color}
                  className="trend-point"
                />
              ))}
            </g>
          )}
        </svg>
        {index !== null && (
          <div
            className="trend-tooltip"
            aria-hidden="true"
            style={{
              left: `${Math.max(23, Math.min(76, (x(index) / width) * 100))}%`,
            }}
          >
            <small>
              {date(index)} <span>· KES</span>
            </small>
            {series.map((s) => (
              <div key={s.name}>
                <span>
                  <i style={{ background: s.color }} />
                  <T>{s.name}</T>
                </span>
                <strong>{money(s.values[index] ?? 0)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="trend-footer">
        <div className="trend-legend">
          {series.map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              <T>{s.name}</T>
            </span>
          ))}
        </div>
        <span className="trend-unit">
          KES · <T>Recorded</T>
        </span>
      </div>
      <details className="trend-data">
        <summary>
          <T>View chart data</T>
        </summary>
        <div className="table-scroll">
          <table className="data-table">
            <caption className="sr-only">
              Recorded business trends in KES, Nairobi time
            </caption>
            <thead>
              <tr>
                <th>
                  <T>Date</T>
                </th>
                {series.map((s) => (
                  <th key={s.name}>
                    <T>{s.name}</T>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((_, i) => (
                <tr key={i}>
                  <th scope="row">{date(i)}</th>
                  {series.map((s) => (
                    <td key={s.name}>{money(s.values[i] ?? 0)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
