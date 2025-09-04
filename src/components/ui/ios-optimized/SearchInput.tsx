import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  context?: 'clients' | 'devices' | 'budgets' | 'universal';
  enableSmartPlaceholder?: boolean;
  isSearching?: boolean;
  showFeedback?: boolean;
  searchStats?: {
    total?: number;
    filtered?: number;
    hasResults?: boolean;
  };
}

export const SearchInput = ({ 
  value, 
  onChange, 
  onClear, 
  placeholder,
  className = "",
  context = 'universal',
  enableSmartPlaceholder = true,
  isSearching = false,
  showFeedback = false,
  searchStats
}: SearchInputProps) => {
  const [currentPlaceholderIndex, setCurrentPlaceholderIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  
  // Smart placeholder logic
  const getContextualPlaceholders = () => {
    switch (context) {
      case 'clients':
        return ['Buscar clientes...', 'Nome, telefone, email...'];
      case 'devices':
        return ['Buscar dispositivos...', 'Modelo, marca, problema...'];
      case 'budgets':
        return ['Buscar orçamentos...', 'Cliente, dispositivo, status...'];
      default:
        return ['Buscar...', 'Digite para buscar...'];
    }
  };
  
  const contextualPlaceholders = getContextualPlaceholders();
  const dynamicPlaceholder = enableSmartPlaceholder && !value && !isFocused
    ? contextualPlaceholders[currentPlaceholderIndex]
    : placeholder || contextualPlaceholders[0];
    
  // Rotate placeholder every 4 seconds when not focused and no value
  useEffect(() => {
    if (!enableSmartPlaceholder || isFocused || value) return;
    
    const interval = setInterval(() => {
      setCurrentPlaceholderIndex(prev => 
        (prev + 1) % contextualPlaceholders.length
      );
    }, 4000);
    
    return () => clearInterval(interval);
  }, [enableSmartPlaceholder, isFocused, value, contextualPlaceholders.length]);
  return (
    <div className={cn(
      'relative',
      className
    )}>
      <div className="relative flex items-center">
        {/* Search/Loading Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        {/* Input Field */}
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={dynamicPlaceholder}
          className={cn(
            "pl-10 pr-10",
            isSearching && "ring-2 ring-blue-200 dark:ring-blue-800 border-blue-300 dark:border-blue-600"
          )}
          inputMode="search"
          autoComplete="off"
          autoFocus={false}
          disabled={isSearching}
          style={{
            WebkitAppearance: 'none',
            fontSize: '16px' // Prevents iOS zoom on focus
          }}
        />

        {/* Clear Button */}
        {value && onClear && !isSearching && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
            style={{ touchAction: 'manipulation' }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      
      {/* Quick Feedback */}
      {showFeedback && value.trim() && searchStats && (
        <div className="mt-1 text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {isSearching ? (
              'Pesquisando...'
            ) : searchStats.hasResults ? (
              `${searchStats.filtered} resultado${searchStats.filtered !== 1 ? 's' : ''}`
            ) : (
              'Nenhum resultado'
            )}
          </span>
          
          {!isSearching && searchStats.total && searchStats.filtered !== searchStats.total && (
            <span className="text-muted-foreground/60">
              de {searchStats.total}
            </span>
          )}
        </div>
      )}
    </div>
  );
};