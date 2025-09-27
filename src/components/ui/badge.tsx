import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'outline' | 'destructive';
  className?: string;
  onClick?: () => void;
}

export function Badge({ 
  children, 
  variant = 'default', 
  className = '',
  onClick 
}: BadgeProps) {
  const baseClasses = 'badge cursor-pointer';
  
  const variantClasses = {
    default: 'badge-primary',
    outline: 'badge-outline',
    destructive: 'badge-error'
  };
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;
  
  return (
    <span className={classes} onClick={onClick}>
      {children}
    </span>
  );
}
