// src/components/ui/Button.tsx

import React, { forwardRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg';
  href?: string;
  className?: string;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', href, children, ...props }, ref) => {
    const baseStyles = cn(
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background',
      {
        'bg-primary-600 text-white hover:bg-primary-700': variant === 'default',
        'border border-primary-200 bg-transparent hover:bg-primary-50 text-primary-700': variant === 'outline',
        'bg-transparent hover:bg-primary-50 text-primary-700': variant === 'ghost',
        'underline-offset-4 hover:underline text-primary-600 p-0': variant === 'link',
        'h-10 py-2 px-4 text-sm': size === 'default',
        'h-9 px-3 text-xs': size === 'sm',
        'h-12 px-8 text-base': size === 'lg',
      },
      className
    );

    if (href) {
      return (
        <Link 
          href={href} 
          className={baseStyles}
          {...(props as any)} // Use with caution, but needed for Link props
        >
          {children}
        </Link>
      );
    }

    return (
      <button className={baseStyles} ref={ref} {...props}>
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };