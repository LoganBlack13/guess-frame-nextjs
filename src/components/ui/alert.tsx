import { ReactNode } from 'react';

interface AlertProps {
  children: ReactNode;
  variant?: 'default' | 'destructive';
  className?: string;
}

interface AlertDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function Alert({
  children,
  variant = 'default',
  className = '',
}: AlertProps) {
  const baseClasses = 'alert';

  const variantClasses = {
    default: 'alert-info',
    destructive: 'alert-error',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  return <div className={classes}>{children}</div>;
}

export function AlertDescription({
  children,
  className = '',
}: AlertDescriptionProps) {
  return <span className={className}>{children}</span>;
}
