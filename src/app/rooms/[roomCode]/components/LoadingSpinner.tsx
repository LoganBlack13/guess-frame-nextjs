'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  text,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <span
        className={`loading loading-spinner ${sizeClasses[size]} text-primary`}
      ></span>
      {text && <p className="text-sm text-base-content/70">{text}</p>}
    </div>
  );
}
