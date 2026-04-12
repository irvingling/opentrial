// ─────────────────────────────────────────────────────────────────────────────
// components/ui.tsx
//
// All reusable UI pieces for OpenTrial live here.
// To change how something looks across the whole app,
// edit it once in this file.
// ─────────────────────────────────────────────────────────────────────────────

// ── Button ────────────────────────────────────────────────────────────────────
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
}

export function Button({
  children,
  onClick,
  type = "button",
  disabled = false,
  variant = "primary",
  size = "md",
}: ButtonProps) {
  const base = "rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:   "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    outline:   "border border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </button>
  );
}

// ── Badge (for status, phase, conditions) ─────────────────────────────────────
interface BadgeProps {
  children: React.ReactNode;
  color?: "green" | "gray" | "yellow" | "blue" | "red" | "orange" | "indigo" | "purple";
}

export function Badge({ children, color = "gray" }: BadgeProps) {
  const colors = {
    green:  "bg-green-100 text-green-800 border-green-200",
    gray:   "bg-gray-100 text-gray-700 border-gray-200",
    yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    blue:   "bg-blue-100 text-blue-800 border-blue-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    orange: "bg-orange-100 text-orange-800 border-orange-200",
    indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    purple: "bg-purple-50 text-purple-700 border-purple-100",
  };

  return (
    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${colors[color]}`}>
      {children}
    </span>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  hoverable?: boolean;
}

export function Card({ children, className = "", hoverable = false }: CardProps) {
  return (
    <div
      className={`
        p-5 border border-gray-200 rounded-xl bg-white
        ${hoverable ? "hover:border-blue-300 hover:shadow-md transition-all duration-150 group cursor-pointer" : ""}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ── SearchInput ───────────────────────────────────────────────────────────────
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? "Search..."}
      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm
                 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
                 focus:border-transparent"
    />
  );
}

// ── LoadingSpinner ────────────────────────────────────────────────────────────
export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex justify-center py-16">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent
                        rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">{message}</p>
      </div>
    </div>
  );
}

// ── ErrorMessage ──────────────────────────────────────────────────────────────
export function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
      <p className="text-red-700 text-sm font-medium">Something went wrong</p>
      <p className="text-red-600 text-sm mt-1">{message}</p>
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
        {title}
      </h1>
      {subtitle && (
        <p className="text-gray-500 text-base">{subtitle}</p>
      )}
    </div>
  );
}

// ── SectionHeading ────────────────────────────────────────────────────────────
export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-gray-900 mb-3">{children}</h2>
  );
}
