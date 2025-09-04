import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { Search, X, Loader2 } from 'lucide-react';

export interface SearchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'outline' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  showClearButton?: boolean;
  onClear?: () => void;
  icon?: React.ReactNode;
}

const SearchButton = forwardRef<HTMLButtonElement, SearchButtonProps>(
  ({
    className,
    variant = 'default',
    size = 'md',
    isLoading = false,
    showClearButton = false,
    onClear,
    icon,
    children,
    ...props
  }, ref) => {
    const baseClasses = [
      'inline-flex items-center justify-center gap-2',
      'font-medium transition-all duration-200 ease-in-out',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:pointer-events-none disabled:opacity-50',
      'active:scale-95 transform',
      'hover:shadow-md'
    ].join(' ');

    const variants = {
      default: [
        'bg-primary text-primary-foreground',
        'hover:bg-primary/90 hover:shadow-lg',
        'active:bg-primary/80'
      ].join(' '),
      ghost: [
        'bg-transparent text-foreground',
        'hover:bg-accent hover:text-accent-foreground',
        'active:bg-accent/80'
      ].join(' '),
      outline: [
        'border border-input bg-background text-foreground',
        'hover:bg-accent hover:text-accent-foreground hover:border-accent',
        'active:bg-accent/80'
      ].join(' '),
      secondary: [
        'bg-secondary text-secondary-foreground',
        'hover:bg-secondary/80 hover:shadow-md',
        'active:bg-secondary/60'
      ].join(' ')
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-md',
      md: 'h-10 px-4 text-sm rounded-lg',
      lg: 'h-12 px-6 text-base rounded-xl'
    };

    const iconSizes = {
      sm: 'h-3 w-3',
      md: 'h-4 w-4',
      lg: 'h-5 w-5'
    };

    const renderIcon = () => {
      if (isLoading) {
        return <Loader2 className={cn('animate-spin', iconSizes[size])} />;
      }
      if (icon) {
        return React.cloneElement(icon as React.ReactElement, {
          className: cn(iconSizes[size], (icon as React.ReactElement).props?.className)
        });
      }
      return <Search className={iconSizes[size]} />;
    };

    return (
      <div className="relative inline-flex items-center">
        <button
          className={cn(
            baseClasses,
            variants[variant],
            sizes[size],
            className
          )}
          ref={ref}
          disabled={isLoading}
          {...props}
        >
          {renderIcon()}
          {children && <span>{children}</span>}
        </button>
        
        {showClearButton && onClear && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              'absolute -right-8 top-1/2 -translate-y-1/2',
              'h-6 w-6 rounded-full',
              'bg-muted hover:bg-muted/80',
              'text-muted-foreground hover:text-foreground',
              'transition-all duration-150',
              'flex items-center justify-center',
              'hover:scale-110 active:scale-95'
            )}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }
);

SearchButton.displayName = 'SearchButton';

export { SearchButton };