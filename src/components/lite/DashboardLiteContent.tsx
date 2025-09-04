import React from 'react';
import { BudgetListUnified } from './BudgetListUnified';
import { BudgetViewLite } from './BudgetViewLite';
import { NewBudgetLite } from './NewBudgetLite';
import { DataManagementLite } from './DataManagementLite';
import { SettingsLite } from './SettingsLite';
import AdminLiteUnified from './AdminLiteUnified';
import { ClientsLite } from './ClientsLite';
import { ServiceOrdersLite } from './ServiceOrdersLite';
import { ServiceOrderTrash } from '@/components/ServiceOrderTrash';

interface DashboardLiteContentProps {
  budgets: any[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  profile?: any;
  activeView?: string;
  selectedBudgetId?: string;
  userId?: string;
  hasPermission?: (permission: string) => boolean;
  onNavigateBack?: () => void;
  onNavigateTo?: (view: string, budgetId?: string) => void;
  isiOSDevice?: boolean;
}

export const DashboardLiteContent = ({ 
  budgets, 
  loading, 
  error, 
  onRefresh,
  profile,
  activeView = 'list',
  selectedBudgetId,
  userId,
  hasPermission,
  onNavigateBack,
  onNavigateTo,
  isiOSDevice = false
}: DashboardLiteContentProps) => {
  
  // Renderizar diferentes views baseado no activeView
  switch (activeView) {
    case 'budget-detail':
      if (!selectedBudgetId) return null;
      return (
        <BudgetViewLite
          budgetId={selectedBudgetId}
          onBack={onNavigateBack || (() => {})}
          onEdit={(budget) => {
            // Navegar para edição ou mostrar modal
            console.log('Edit budget:', budget);
          }}
          onCopy={(budget) => {
            // Copiar orçamento
            console.log('Copy budget:', budget);
          }}
        />
      );
      
    case 'new-budget':
      return (
        <NewBudgetLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );
    case 'clients':
      return (
        <ClientsLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );
      
    case 'service-orders':
      return (
        <ServiceOrdersLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );
      
    case 'service-orders-trash':
      return (
        <div className="p-4">
          <ServiceOrderTrash />
        </div>
      );
      
    case 'data-management':
      return (
        <DataManagementLite
          userId={userId || ''}
          onBack={onNavigateBack || (() => {})}
        />
      );
      
    case 'settings':
      return (
        <SettingsLite
          userId={userId || ''}
          profile={profile}
          onBack={onNavigateBack || (() => {})}
        />
      );
      
    case 'admin':
      if (!hasPermission?.('manage_users')) return null;
      return (
        <AdminLiteUnified
          variant="enhanced"
        />
      );
      
    case 'budgets':
    case 'list':
    default:
      // Determine variant based on device and view context
      const budgetVariant = isiOSDevice ? { type: 'ios' as const } : 
                           hasPermission?.('enhanced_features') ? { type: 'enhanced' as const } : 
                           { type: 'standard' as const };
      
      return (
        <BudgetListUnified
          budgets={budgets}
          profile={profile}
          loading={loading}
          error={error}
          onRefresh={onRefresh}
          userId={userId}
          onNavigateTo={onNavigateTo}
          budgetVariant={budgetVariant}
        />
      );
  }
};