# Exemplos Práticos de Implementação - Refatoração Onedrip

## 1. AdminLiteUnified - Implementação Completa

### 1.1 Componente Principal Refatorado

```typescript
// src/components/admin/AdminLiteUnified.tsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users, Key, Settings, Gamepad2, BarChart3, Shield } from 'lucide-react';
import { useAdminData } from '@/hooks/useAdminData';
import { UserManagementSection } from './sections/UserManagementSection';
import { AdminLicenseManagerEnhanced } from './AdminLicenseManagerEnhanced';
import { VipUserManagement } from './VipUserManagement';
import { GameSettingsPanel } from './GameSettingsPanel';
import { UserAnalytics } from './sections/UserAnalytics';
import { AdminLogs } from './sections/AdminLogs';

interface AdminLiteUnifiedProps {
  userId: string;
  onBack: () => void;
  enhanced?: boolean;
  profile?: any;
}

const AdminLiteUnified: React.FC<AdminLiteUnifiedProps> = ({
  userId,
  onBack,
  enhanced = false,
  profile
}) => {
  const [activeTab, setActiveTab] = useState('users');
  const adminData = useAdminData(enhanced);
  
  const tabs = useMemo(() => {
    const baseTabs = [
      { id: 'users', label: 'Usuários', icon: Users, component: UserManagementSection },
      { id: 'licenses', label: 'Licenças', icon: Key, component: AdminLicenseManagerEnhanced },
      { id: 'vip', label: 'VIP', icon: Settings, component: VipUserManagement },
      { id: 'game', label: 'Jogo', icon: Gamepad2, component: GameSettingsPanel }
    ];

    if (enhanced) {
      baseTabs.push(
        { id: 'analytics', label: 'Analytics', icon: BarChart3, component: UserAnalytics },
        { id: 'logs', label: 'Logs', icon: Shield, component: AdminLogs }
      );
    }

    return baseTabs;
  }, [enhanced]);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              {enhanced ? 'Painel Administrativo Avançado' : 'Painel Administrativo'}
            </h1>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminData.stats.totalUsers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Usuários Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {adminData.stats.activeUsers}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Licenças Expiradas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {adminData.stats.expiredUsers}
              </div>
            </CardContent>
          </Card>
          
          {enhanced && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Administradores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {adminData.stats.adminUsers}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-6">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id} className="mt-6">
              {ActiveComponent && (
                <ActiveComponent 
                  {...adminData}
                  enhanced={enhanced}
                  profile={profile}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default AdminLiteUnified;
```

### 1.2 Hook useAdminData Otimizado

```typescript
// src/hooks/useAdminData.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { useBulkOperations } from './useBulkOperations';
import { useUserAnalytics } from './useUserAnalytics';
import { useDataExport } from './useDataExport';

export const useAdminData = (enhanced = false) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [userToRenew, setUserToRenew] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch users with React Query
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Usuário excluído com sucesso' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao excluir usuário', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Renew license mutation
  const renewUserLicenseMutation = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + days);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          expiration_date: newExpirationDate.toISOString(),
          license_active: true 
        })
        .eq('id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast({ title: 'Licença renovada com sucesso' });
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao renovar licença', 
        description: error.message,
        variant: 'destructive' 
      });
    }
  });

  // Enhanced features (conditional)
  const enhancedFeatures = useMemo(() => {
    if (!enhanced) return {};
    
    return {
      bulkOperations: useBulkOperations(users),
      analytics: useUserAnalytics(users),
      exportData: useDataExport(users)
    };
  }, [enhanced, users]);

  // Filtered users with optimized search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    
    const searchLower = searchTerm.toLowerCase();
    return users.filter(user => 
      user.email?.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.id?.toLowerCase().includes(searchLower)
    );
  }, [users, searchTerm]);

  // User statistics
  const stats = useMemo(() => {
    if (!users.length) {
      return { totalUsers: 0, activeUsers: 0, expiredUsers: 0, adminUsers: 0 };
    }
    
    const now = new Date();
    return {
      totalUsers: users.length,
      activeUsers: users.filter(user => 
        user.license_active && new Date(user.expiration_date) > now
      ).length,
      expiredUsers: users.filter(user => 
        !user.license_active || new Date(user.expiration_date) <= now
      ).length,
      adminUsers: enhanced ? users.filter(user => user.role === 'admin').length : 0
    };
  }, [users, enhanced]);

  // Event handlers
  const handleEdit = useCallback((user: any) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  }, []);

  const handleDelete = useCallback((user: any) => {
    setUserToDelete(user);
  }, []);

  const handleRenew = useCallback((user: any) => {
    setUserToRenew(user);
  }, []);

  const confirmDelete = useCallback(() => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id);
      setUserToDelete(null);
    }
  }, [userToDelete, deleteUserMutation]);

  const confirmRenewal = useCallback((days: number) => {
    if (userToRenew) {
      renewUserLicenseMutation.mutate({ userId: userToRenew.id, days });
      setUserToRenew(null);
    }
  }, [userToRenew, renewUserLicenseMutation]);

  return {
    // Base state
    searchTerm,
    setSearchTerm,
    selectedUser,
    setSelectedUser,
    isEditModalOpen,
    setIsEditModalOpen,
    userToDelete,
    setUserToDelete,
    userToRenew,
    setUserToRenew,
    
    // Data
    users,
    isLoading,
    error,
    filteredUsers,
    stats,
    
    // Mutations
    deleteUserMutation,
    renewUserLicenseMutation,
    
    // Handlers
    handleEdit,
    handleDelete,
    handleRenew,
    confirmDelete,
    confirmRenewal,
    
    // Enhanced features (conditional)
    ...enhancedFeatures
  };
};
```

## 2. BudgetListUnified - Implementação Modular

### 2.1 Componente Base

```typescript
// src/components/budget/BudgetListUnified.tsx
import React from 'react';
import { useBudgetListConfig } from '@/hooks/useBudgetListConfig';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useBudgetOperations } from '@/hooks/useBudgetOperations';
import { useSearchWithDebounce } from '@/hooks/useSearchWithDebounce';

interface BudgetListUnifiedProps {
  variant: 'standard' | 'ios' | 'enhanced';
  userId: string;
  profile: any;
  onNavigateTo?: (view: string, id?: string) => void;
}

export const BudgetListUnified: React.FC<BudgetListUnifiedProps> = ({
  variant,
  userId,
  profile,
  onNavigateTo
}) => {
  const config = useBudgetListConfig(variant);
  const { budgets, loading, error, handleRefresh } = useBudgetData(userId);
  const operations = useBudgetOperations(variant);
  const [searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch] = useSearchWithDebounce();
  
  const filteredBudgets = React.useMemo(() => {
    return config.filterFunction(budgets, debouncedSearchTerm);
  }, [budgets, debouncedSearchTerm, config.filterFunction]);

  if (loading) return <config.LoadingComponent />;
  if (error) return <config.ErrorComponent error={error} onRetry={handleRefresh} />;

  return (
    <config.ContainerComponent>
      <config.HeaderComponent 
        title={config.title}
        subtitle={`${filteredBudgets.length} orçamentos`}
      />
      
      <config.SearchComponent 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={clearSearch}
        placeholder={config.searchPlaceholder}
      />
      
      <config.ListComponent
        budgets={filteredBudgets}
        operations={operations}
        profile={profile}
        onNavigateTo={onNavigateTo}
        variant={variant}
      />
    </config.ContainerComponent>
  );
};
```

### 2.2 Hook de Configuração

```typescript
// src/hooks/useBudgetListConfig.ts
import { useMemo } from 'react';
import { StandardContainer, IOSContainer, EnhancedContainer } from '@/components/budget/containers';
import { StandardSearch, IOSSearch, EnhancedSearch } from '@/components/budget/search';
import { StandardList, IOSList, EnhancedList } from '@/components/budget/lists';
import { StandardSkeleton, IOSSkeleton, EnhancedSkeleton } from '@/components/budget/skeletons';
import { StandardError, IOSError, EnhancedError } from '@/components/budget/errors';
import { StandardHeader, IOSHeader, EnhancedHeader } from '@/components/budget/headers';

export const useBudgetListConfig = (variant: 'standard' | 'ios' | 'enhanced') => {
  return useMemo(() => {
    const configs = {
      standard: {
        title: 'Meus Orçamentos',
        searchPlaceholder: 'Buscar orçamentos...',
        ContainerComponent: StandardContainer,
        HeaderComponent: StandardHeader,
        SearchComponent: StandardSearch,
        ListComponent: StandardList,
        LoadingComponent: StandardSkeleton,
        ErrorComponent: StandardError,
        filterFunction: (budgets: any[], searchTerm: string) => {
          if (!searchTerm) return budgets;
          const search = searchTerm.toLowerCase();
          return budgets.filter(budget => 
            budget.client_name?.toLowerCase().includes(search) ||
            budget.client_phone?.toLowerCase().includes(search) ||
            budget.device_model?.toLowerCase().includes(search)
          );
        }
      },
      ios: {
        title: 'Orçamentos',
        searchPlaceholder: 'Buscar...',
        ContainerComponent: IOSContainer,
        HeaderComponent: IOSHeader,
        SearchComponent: IOSSearch,
        ListComponent: IOSList,
        LoadingComponent: IOSSkeleton,
        ErrorComponent: IOSError,
        filterFunction: (budgets: any[], searchTerm: string) => {
          if (!searchTerm) return budgets;
          const search = searchTerm.toLowerCase();
          return budgets.filter(budget => 
            budget.client_name?.toLowerCase().includes(search) ||
            budget.device_model?.toLowerCase().includes(search) ||
            budget.problem_description?.toLowerCase().includes(search)
          );
        }
      },
      enhanced: {
        title: 'Gerenciamento de Orçamentos',
        searchPlaceholder: 'Busca avançada...',
        ContainerComponent: EnhancedContainer,
        HeaderComponent: EnhancedHeader,
        SearchComponent: EnhancedSearch,
        ListComponent: EnhancedList,
        LoadingComponent: EnhancedSkeleton,
        ErrorComponent: EnhancedError,
        filterFunction: (budgets: any[], searchTerm: string) => {
          if (!searchTerm) return budgets;
          const search = searchTerm.toLowerCase();
          return budgets.filter(budget => 
            budget.client_name?.toLowerCase().includes(search) ||
            budget.client_phone?.toLowerCase().includes(search) ||
            budget.device_model?.toLowerCase().includes(search) ||
            budget.problem_description?.toLowerCase().includes(search) ||
            budget.part_quality?.toLowerCase().includes(search)
          );
        }
      }
    };
    
    return configs[variant];
  }, [variant]);
};
```

### 2.3 Hook de Operações Unificado

```typescript
// src/hooks/useBudgetOperations.ts
import { useCallback } from 'react';
import { useBudgetDeletion } from '@/hooks/useBudgetDeletion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsapp';

export const useBudgetOperations = (variant: 'standard' | 'ios' | 'enhanced') => {
  const { handleSingleDeletion, isDeleting } = useBudgetDeletion();
  const { toast } = useToast();
  
  const handleShareWhatsApp = useCallback(async (budget: any) => {
    try {
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      const budgetData = error ? budget : fullBudget;
      const message = generateWhatsAppMessage({
        ...budgetData,
        part_quality: budgetData.part_quality || budgetData.part_type || 'Reparo'
      });
      
      shareViaWhatsApp(message);
      
      toast({
        title: "Redirecionando...",
        description: "Você será redirecionado para o WhatsApp.",
        duration: 2000
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      toast({
        title: "Erro ao compartilhar",
        description: "Ocorreu um erro ao preparar o compartilhamento.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleDelete = useCallback(async (budget: any) => {
    try {
      if (variant === 'ios') {
        // iOS specific deletion with audit
        const { data, error } = await supabase.rpc('soft_delete_budget_with_audit', {
          p_budget_id: budget.id,
          p_deletion_reason: 'Exclusão via interface mobile iOS'
        });
        
        if (error || !data?.success) {
          throw new Error(data?.error || 'Falha na exclusão do orçamento');
        }
        
        toast({
          title: "Orçamento excluído",
          description: "O orçamento foi excluído com sucesso."
        });
      } else {
        // Standard deletion
        await handleSingleDeletion({ budgetId: budget.id });
      }
    } catch (error) {
      console.error('Erro ao deletar orçamento:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o orçamento.",
        variant: "destructive"
      });
      throw error;
    }
  }, [variant, handleSingleDeletion, toast]);

  const handleEdit = useCallback((budget: any, onNavigateTo?: (view: string, id?: string) => void) => {
    if (onNavigateTo) {
      onNavigateTo('edit', budget.id);
    } else {
      // Fallback navigation logic based on variant
      switch (variant) {
        case 'ios':
          // iOS specific navigation
          window.location.href = `/budget/edit/${budget.id}?ios=true`;
          break;
        case 'enhanced':
          // Enhanced edit features
          window.location.href = `/budget/edit/${budget.id}?enhanced=true`;
          break;
        default:
          // Standard edit
          window.location.href = `/budget/edit/${budget.id}`;
          break;
      }
    }
  }, [variant]);

  const handleView = useCallback((budget: any, onNavigateTo?: (view: string, id?: string) => void) => {
    if (onNavigateTo) {
      onNavigateTo('view', budget.id);
    } else {
      window.location.href = `/budget/view/${budget.id}`;
    }
  }, []);

  return {
    handleShareWhatsApp,
    handleDelete,
    handleEdit,
    handleView,
    isDeleting
  };
};
```

## 3. Hooks Utilitários Compartilhados

### 3.1 useSearchWithDebounce

```typescript
// src/hooks/useSearchWithDebounce.ts
import { useState, useEffect, useCallback } from 'react';

export const useSearchWithDebounce = (initialValue = '', delay = 300) => {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialValue);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [searchTerm, delay]);
  
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
  }, []);
  
  return [searchTerm, debouncedSearchTerm, setSearchTerm, clearSearch] as const;
};
```

### 3.2 useBudgetData

```typescript
// src/hooks/useBudgetData.ts
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export const useBudgetData = (userId: string) => {
  const { data: budgets = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['budgets', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('deleted', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false
  });

  const handleRefresh = () => {
    refetch();
  };

  return {
    budgets,
    loading,
    error,
    handleRefresh
  };
};
```

## 4. Componentes de Interface Específicos

### 4.1 Containers

```typescript
// src/components/budget/containers/StandardContainer.tsx
import React from 'react';

interface StandardContainerProps {
  children: React.ReactNode;
}

export const StandardContainer: React.FC<StandardContainerProps> = ({ children }) => {
  return (
    <div className="p-4 space-y-4">
      {children}
    </div>
  );
};

// src/components/budget/containers/IOSContainer.tsx
export const IOSContainer: React.FC<StandardContainerProps> = ({ children }) => {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {children}
    </div>
  );
};

// src/components/budget/containers/EnhancedContainer.tsx
export const EnhancedContainer: React.FC<StandardContainerProps> = ({ children }) => {
  return (
    <div className="p-4 space-y-6 max-w-7xl mx-auto">
      {children}
    </div>
  );
};
```

### 4.2 Search Components

```typescript
// src/components/budget/search/StandardSearch.tsx
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface SearchProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  placeholder?: string;
}

export const StandardSearch: React.FC<SearchProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  placeholder = 'Buscar...'
}) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        className="pl-10 pr-10"
      />
      {searchTerm && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSearch}
          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
```

## 5. Plano de Migração

### 5.1 Fase 1: Preparação (1-2 dias)
- [ ] Criar estrutura de pastas para componentes unificados
- [ ] Implementar hooks compartilhados
- [ ] Configurar feature flags
- [ ] Criar testes de compatibilidade

### 5.2 Fase 2: AdminLite (2-3 dias)
- [ ] Implementar AdminLiteUnified
- [ ] Migrar useAdminData
- [ ] Testar funcionalidades existentes
- [ ] Ativar feature flag gradualmente

### 5.3 Fase 3: BudgetList (2-3 dias)
- [ ] Implementar BudgetListUnified
- [ ] Criar componentes específicos por variante
- [ ] Migrar hooks de dados
- [ ] Testar em diferentes dispositivos

### 5.4 Fase 4: Limpeza (1 dia)
- [ ] Remover componentes antigos
- [ ] Atualizar imports
- [ ] Documentar mudanças
- [ ] Verificar bundle size

### 5.5 Checklist de Verificação
- [ ] Todas as funcionalidades mantidas
- [ ] Performance igual ou melhor
- [ ] Testes passando
- [ ] Bundle size reduzido
- [ ] Código mais legível
- [ ] Documentação atualizada

Esta implementação garante que todas as funcionalidades existentes sejam preservadas enquanto reduz significativamente a duplicação de código e melhora a manutenibilidade.