"use client";
import { T, LocalButton, LocalInput, LocalSelect } from "@/components/locale";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  Search,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { initials, money } from "@/lib/data";
import { useOptionalDemo } from "@/lib/store";

export function Brand({
  light = false,
  compact = false,
}: {
  light?: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      className={`brand ${light ? "brand-light" : ""}`}
      aria-label="BiasharaOS home"
    >
      <span className="brand-symbol">
        <T>b</T>
        <span />
      </span>

      <T>
        {!compact && (
          <span>
            <T>Biashara</T>
            <span className="brand-os">
              <T>OS</T>
            </span>
          </span>
        )}
      </T>
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  href?: string;
  variant?: "primary" | "dark" | "secondary" | "ghost" | "danger" | "white";
  size?: "small" | "large";
  icon?: LucideIcon;
  arrow?: boolean;
};
export function Button({
  href,
  variant = "primary",
  size,
  icon: Icon,
  arrow,
  className = "",
  children,
  ...props
}: ButtonProps) {
  const content = (
    <>
      <T>{Icon && <Icon size={17} />}</T> <T>{children}</T>{" "}
      <T>{arrow && <ArrowRight size={17} />}</T>
    </>
  );
  const classes = `btn btn-${variant} ${size ? `btn-${size}` : ""} ${className}`;
  return href ? (
    <Link href={href} className={classes}>
      <T>{content}</T>
    </Link>
  ) : (
    <LocalButton type="button" className={classes} {...props}>
      <T>{content}</T>
    </LocalButton>
  );
}

export function Badge({
  children,
  tone = "green",
  dot = false,
}: {
  children: ReactNode;
  tone?: string;
  dot?: boolean;
}) {
  return (
    <span className={`badge badge-${tone}`}>
      <T>{dot && <span className="status-dot" />}</T> <T>{children}</T>
    </span>
  );
}
export function IconBox({
  icon: Icon,
  tone = "green",
  size = "",
}: {
  icon: LucideIcon;
  tone?: string;
  size?: string;
}) {
  return (
    <span className={`icon-box tone-${tone} ${size}`}>
      <Icon size={21} strokeWidth={1.8} />
    </span>
  );
}
export function Avatar({
  name,
  color = "mint",
  photo = false,
  small = false,
}: {
  name: string;
  color?: string;
  photo?: boolean;
  small?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${color} ${photo ? "avatar-photo" : ""} ${small ? "avatar-small" : ""}`}
      aria-label={name}
    >
      <T>{!photo && initials(name)}</T>
    </span>
  );
}
export function ProductArt({
  art,
  name,
  small = false,
}: {
  art: number;
  name: string;
  small?: boolean;
}) {
  return (
    <span
      className={`product-art ${small ? "product-art-small" : ""}`}
      role="img"
      aria-label={name}
      style={{
        backgroundPosition: `${((art % 4) * 100) / 3}% ${art < 4 ? 0 : 100}%`,
      }}
    />
  );
}

export function Field({
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
}) {
  const generated = useId();
  const id = props.id ?? generated;
  return (
    <div className="field">
      <label htmlFor={id}>
        <T>{label}</T>
      </label>
      <LocalInput
        {...props}
        id={id}
        className={`input ${error ? "input-error" : ""} ${props.className ?? ""}`}
        aria-invalid={Boolean(error)}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
      />

      <T>
        {(hint || error) && (
          <small id={`${id}-hint`} className={error ? "text-red" : "muted"}>
            <T>{error || hint}</T>
          </small>
        )}
      </T>
    </div>
  );
}
export function SelectField({
  label,
  name,
  children,
  defaultValue,
  value,
  onChange,
  required,
}: {
  label: string;
  name?: string;
  children: ReactNode;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>
        <T>{label}</T>
      </label>
      <div className="select-wrap">
        <LocalSelect
          className="input"
          id={id}
          name={name}
          required={required}
          defaultValue={defaultValue}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
        >
          <T>{children}</T>
        </LocalSelect>
        <ChevronDown size={16} />
      </div>
    </div>
  );
}
export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`search-field ${className}`}>
      <Search size={17} />
      <LocalInput
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="tabs">
      <T>
        {items.map((item) => (
          <LocalButton
            key={item}
            type="button"
            aria-pressed={item === value}
            className={item === value ? "active" : ""}
            onClick={() => onChange(item)}
          >
            <T>{item}</T>
          </LocalButton>
        ))}
      </T>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const business = useOptionalDemo();
  const store = business?.store;
  const close = () => {
    if (!store?.busy) onClose();
  };
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          const r = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < r.left ||
            e.clientX > r.right ||
            e.clientY < r.top ||
            e.clientY > r.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-heading">
        <div>
          <h2 id={titleId}>
            <T>{title}</T>
          </h2>

          <T>
            {description && (
              <p>
                <T>{description}</T>
              </p>
            )}
          </T>
        </div>
        <LocalButton
          className="icon-button"
          onClick={close}
          disabled={store?.busy}
          aria-label="Close sheet"
        >
          <X size={19} />
        </LocalButton>
      </div>
      {store?.error && (
        <p role="alert" className="operation-error">
          {store.error}
        </p>
      )}
      {store?.busy && <p role="status">Saving…</p>}
      <fieldset
        className="sheet-fields"
        disabled={store?.busy || store?.hasPending}
      >
        <T>{children}</T>
      </fieldset>
      {store?.hasPending && !store.busy && (
        <Button
          variant="secondary"
          onClick={() => {
            void store
              .retry()
              .then(() => onClose())
              .catch(() => {});
          }}
        >
          Retry saved request
        </Button>
      )}
    </dialog>
  );
}

const ToastContext = createContext<
  (message: string, tone?: "success" | "info") => void
>(() => {});
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ message: string; tone: string } | null>(
    null,
  );
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  function notify(message: string, tone = "success") {
    if (timer.current) clearTimeout(timer.current);
    setToast({ message, tone });
    timer.current = setTimeout(() => setToast(null), 4500);
  }
  return (
    <ToastContext.Provider value={notify}>
      <T>{children}</T>{" "}
      <T>
        {toast && (
          <div className="toast" role="status">
            <T>
              {toast.tone === "success" ? (
                <CheckCircle2 size={19} />
              ) : (
                <Sparkles size={19} />
              )}
            </T>

            <span>
              <T>{toast.message}</T>
            </span>
            <LocalButton
              aria-label="Dismiss notification"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </LocalButton>
          </div>
        )}
      </T>
    </ToastContext.Provider>
  );
}
export const useToast = () => useContext(ToastContext);

export function StatCard({
  label,
  value,
  change,
  tone = "green",
  icon: Icon,
  note,
}: {
  label: string;
  value: string;
  change?: string;
  tone?: string;
  icon?: LucideIcon;
  note?: string;
}) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-label">
        <T>{label}</T> <T>{Icon && <Icon size={17} />}</T>
      </div>
      <strong>
        <T>{value}</T>
      </strong>
      <div className="stat-note">
        <T>
          {change && (
            <span className={`text-${tone}`}>
              <T>↗</T> <T>{change}</T>
            </span>
          )}
        </T>{" "}
        <T>
          {note && (
            <span>
              <T>{note}</T>
            </span>
          )}
        </T>
      </div>
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <T>
          {eyebrow && (
            <p className="eyebrow">
              <T>{eyebrow}</T>
            </p>
          )}
        </T>

        <h1>
          <T>{title}</T>
        </h1>

        <T>
          {description && (
            <p>
              <T>{description}</T>
            </p>
          )}
        </T>
      </div>

      <T>
        {children && (
          <div className="heading-actions">
            <T>{children}</T>
          </div>
        )}
      </T>
    </div>
  );
}
export function EmptyState({
  icon: Icon = Search,
  title,
  description,
  children,
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <IconBox icon={Icon} />
      <h3>
        <T>{title}</T>
      </h3>
      <p>
        <T>{description}</T>
      </p>
      <T>{children}</T>
    </div>
  );
}
export function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="check-list">
      <T>
        {items.map((item) => (
          <li key={item}>
            <Check size={16} />
            <span>
              <T>{item}</T>
            </span>
          </li>
        ))}
      </T>
    </ul>
  );
}
export function Currency({ value }: { value: number }) {
  return (
    <span className="currency">
      <span>
        <T>KES</T>
      </span>
      <T> </T> <T>{money(value)}</T>
    </span>
  );
}

export function SalesChart({
  period = "Week",
  bars = false,
  mini = false,
  series,
  label = "sales",
}: {
  label?: string;
  period?: string;
  bars?: boolean;
  mini?: boolean;
  series?: number[];
}) {
  const low = series ? Math.min(0, ...series) : 0;
  const high = series ? Math.max(1, ...series) : 100;
  const zeroY = 190 - ((0 - low) / (high - low)) * 90 * 1.65;
  const values = series
    ? series.map((v) => ((v - low) / (high - low)) * 90)
    : period === "Month"
      ? [30, 23, 40, 35, 55, 43, 60, 56, 72, 64, 82, 76, 92]
      : period === "Day"
        ? [18, 28, 22, 40, 30, 52, 43, 62, 38, 74, 62, 90, 77]
        : [20, 33, 27, 49, 39, 58, 43, 65, 56, 78, 72, 94, 85];
  const id = useId().replaceAll(":", "");
  const points = values
    .map(
      (v, i) =>
        `${28 + i * (504 / Math.max(1, values.length - 1))},${190 - v * 1.65}`,
    )
    .join(" ");
  return (
    <div
      className={`sales-chart ${mini ? "chart-mini" : ""}`}
      role="img"
      aria-label={`${series ? "Recorded" : "Illustrative"} ${period.toLowerCase()} ${label} trend`}
    >
      <svg viewBox="0 0 560 220" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`area${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00815d" stopOpacity=".2" />
            <stop offset="100%" stopColor="#00815d" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`bar${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#20aa80" />
            <stop offset="100%" stopColor="#c4ebdb" />
          </linearGradient>
        </defs>
        <T>
          {[40, 90, 140, 190].map((y) => (
            <line
              key={y}
              x1="20"
              y1={y}
              x2="550"
              y2={y}
              stroke="#eaf0f2"
              strokeDasharray={bars ? "0" : "4 5"}
            />
          ))}
        </T>{" "}
        <T>
          {bars ? (
            values.map((v, i) => (
              <rect
                key={i}
                x={23 + i * (520 / values.length)}
                y={Math.min(190 - v * 1.65, zeroY)}
                width={Math.max(2, (520 / values.length) * 0.65)}
                height={Math.abs(zeroY - (190 - v * 1.65))}
                rx="5"
                fill={i === 8 ? "#00815d" : `url(#bar${id})`}
              />
            ))
          ) : (
            <>
              <polygon
                points={`28,${zeroY} ${points} 532,${zeroY}`}
                fill={`url(#area${id})`}
              />
              <polyline
                points={points}
                stroke="#00815d"
                strokeWidth="3"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <circle
                cx="532"
                cy={190 - values.at(-1)! * 1.65}
                r="5"
                fill="#00815d"
                stroke="white"
                strokeWidth="3"
              />
            </>
          )}
        </T>
      </svg>
      <div className="chart-labels">
        <T>
          {(series
            ? period === "Day"
              ? ["12 AM", "6 AM", "12 PM", "6 PM", "11 PM"]
              : ["Period start", "", "", "", "Period end"]
            : period === "Day"
              ? ["8 AM", "11 AM", "2 PM", "5 PM", "8 PM"]
              : period === "Month"
                ? ["1 Oct", "7 Oct", "14 Oct", "21 Oct", "31 Oct"]
                : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
          ).map((t, i) => (
            <span key={i}>
              <T>{t}</T>
            </span>
          ))}
        </T>
      </div>
    </div>
  );
}
