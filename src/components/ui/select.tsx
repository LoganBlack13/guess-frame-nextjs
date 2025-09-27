import { SelectHTMLAttributes, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  children: ReactNode;
  className?: string;
  onValueChange?: (value: string) => void;
}

export function Select({ children, className = '', onValueChange, ...props }: SelectProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onValueChange) {
      onValueChange(e.target.value);
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <select 
      className={`select select-bordered w-full ${className}`}
      onChange={handleChange}
      {...props}
    >
      {children}
    </select>
  );
}
