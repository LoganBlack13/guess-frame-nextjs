import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
}

export function Button({
  children,
  variant = 'default',
  size = 'default',
  className = '',
  ...props
}: ButtonProps) {
  const baseClasses = 'btn';

  const variantClasses = {
    default: 'btn-primary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    destructive: 'btn-error',
  };

  const sizeClasses = {
    sm: 'btn-sm',
    default: '',
    lg: 'btn-lg',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
