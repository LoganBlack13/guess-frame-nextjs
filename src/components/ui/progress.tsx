interface ProgressProps {
  value: number;
  max?: number;
  className?: string;
}

export function Progress({ value, max = 100, className = '' }: ProgressProps) {
  return (
    <progress
      className={`progress w-full ${className}`}
      value={value}
      max={max}
    />
  );
}
