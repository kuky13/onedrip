import React, { useState, useCallback, useMemo, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { useBudgetDeletion } from '@/hooks/useBudgetDeletion';
import { useToast } from '@/hooks/useToast';
import { useBudgetData } from '@/hooks/useBudgetData';
import { useAuth } from '@/hooks/useAuth';
import { EditBudgetModal } from '@/components/EditBudgetModal';
import { SecureRedirect } from '@/utils/secureRedirect';
import { Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Standard components
import { BudgetLiteSearch } from './BudgetLiteSearch';
import { BudgetLiteCard } from './BudgetLiteCard';

// iOS components
import { BudgetLiteCardiOS } from './BudgetLiteCardiOS';
import { IOSContextualHeaderEnhanced } from './enhanced/IOSContextualHeaderEnhanced';
import { GlassCard } from '@/components/ui/animations/micro-interactions';
import { StaggerContainer } from '@/components/ui/animations/page-transitions';
import { AdvancedSkeleton } from '@/components/ui/animations/loading-states';

// Enhanced components
import { UniversalSearchInput } from '@/components/ui/ios-optimized/UniversalSearchInput';
import { EnhancedBudgetCard } from './ios/EnhancedBudgetCard';
import { FloatingActionButton, createDefaultFABActions } from '@/components/ui/ios-optimized/FloatingActionButton';
import { BottomSheet } from '@/components/ui/ios-optimized/BottomSheet';
import { PullToRefresh } from '@/components/ui/ios-optimized/PullToRefresh';
import { IOSToastContainer, useIOSToast } from '@/components/ui/ios-optimized/IOSToast';
import { BudgetCardSkeleton } from '@/components/ui/ios-optimized/SkeletonLoader';

interface Budget {
  id: string;
  client_name?: string;
  device_model?: string;
  device_type?: string;
  issue?: string;
  total_price?: number;
  cash_price?: number;
  installment_price?: number;
  installments?: number;
  workflow_status?: string;
  is_paid?: boolean;
  is_delivered?: boolean;
  expires_at?: string;
  approved_at?: string;
  payment_confirmed_at?: string;
  delivery_confirmed_at?: string;
  created_at: string;
  warranty_months?: number;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
  valid_until?: string;
  part_type?: string;
  part_quality?: string;
  brand?: string;
  owner_id?: string;
  deleted_at?: string | null;
  delivery_date?: string;
  notes?: string;
}

type BudgetListVariant = {
  type: 'standard' | 'ios' | 'enhanced';
};

interface BudgetListUnifiedProps {
  // Standard variant props
  budgets?: Budget[];
  profile?: any;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  
  // iOS/Enhanced variant props
  userId?: string;
  onNavigateTo?: (view: string, id?: string) => void;
  
  // Variant configuration
  budgetVariant: BudgetListVariant;
}

export const BudgetListUnified = memo(({
  budgets: propBudgets,
  profile: propProfile,
  loading: propLoading,
  error: propError,
  onRefresh: propOnRefresh,
  userId,
  onNavigateTo,
  budgetVariant
}: BudgetListUnifiedProps) => {
  // Conditional hooks based on variant
  const { user, profile: authProfile } = budgetVariant.type !== 'standard' ? useAuth() : { user: null, profile: null };
  const { budgets: hookBudgets, loading: hookLoading, error: hookError, handleRefresh } = 
    budgetVariant.type !== 'standard' ? useBudgetData(userId || user?.id || '') : 
    { budgets: [], loading: false, error: null, handleRefresh: () => {} };
  
  // Enhanced variant specific hooks
  const { toasts, showSuccess, showError, showInfo, removeToast } = 
    budgetVariant.type === 'enhanced' ? useIOSToast() : 
    { toasts: [], showSuccess: () => {}, showError: () => {}, showInfo: () => {}, removeToast: () => {} };
  
  // Standard variant hooks
  const { handleSingleDeletion, isDeleting } = budgetVariant.type === 'standard' ? useBudgetDeletion() : { handleSingleDeletion: async () => {}, isDeleting: false };
  const { toast } = useToast();

  // Determine data source based on variant
  const budgets = budgetVariant.type === 'standard' ? (propBudgets || []) : hookBudgets;
  const profile = budgetVariant.type === 'standard' ? propProfile : authProfile;
  const loading = budgetVariant.type === 'standard' ? (propLoading || false) : hookLoading;
  const error = budgetVariant.type === 'standard' ? propError : hookError;
  const onRefresh = budgetVariant.type === 'standard' ? (propOnRefresh || (() => {})) : handleRefresh;

  // Common state
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // iOS variant specific state
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Enhanced variant specific state
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'date' | 'price' | 'client'>('date');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter budgets based on search and filters
  const filteredBudgets = useMemo(() => {
    let filtered = budgets;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(budget => 
        budget.client_name?.toLowerCase().includes(searchLower) ||
        budget.device_model?.toLowerCase().includes(searchLower) ||
        budget.device_type?.toLowerCase().includes(searchLower) ||
        budget.part_quality?.toLowerCase().includes(searchLower) ||
        budget.part_type?.toLowerCase().includes(searchLower)
      );
    }

    // Enhanced variant status filter
    if (budgetVariant.type === 'enhanced' && filterStatus !== 'all') {
      switch (filterStatus) {
        case 'pending':
          filtered = filtered.filter(b => b.workflow_status === 'pending');
          break;
        case 'approved':
          filtered = filtered.filter(b => b.workflow_status === 'approved');
          break;
        case 'paid':
          filtered = filtered.filter(b => b.is_paid === true);
          break;
        case 'delivered':
          filtered = filtered.filter(b => b.is_delivered === true);
          break;
      }
    }

    // Enhanced variant sorting
    if (budgetVariant.type === 'enhanced') {
      return filtered.sort((a, b) => {
        switch (sortBy) {
          case 'date':
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          case 'price':
            return (b.cash_price || b.total_price || 0) - (a.cash_price || a.total_price || 0);
          case 'client':
            return (a.client_name || '').localeCompare(b.client_name || '');
          default:
            return 0;
        }
      });
    }

    return filtered;
  }, [budgets, searchTerm, filterStatus, sortBy, budgetVariant.type]);

  // Real-time subscription for standard variant
  useEffect(() => {
    if (budgetVariant.type !== 'standard' || !profile?.user_id) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    
    const subscription = supabase
      .channel('budget_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `owner_id=eq.${profile.user_id}`,
        },
        (payload) => {
          console.log('Budget change detected:', payload);
          
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          
          debounceTimer = setTimeout(() => {
            onRefresh();
            debounceTimer = null;
          }, 500);
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(subscription);
    };
  }, [profile?.user_id, onRefresh, budgetVariant.type]);

  // Common handlers
  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
    if (budgetVariant.type === 'ios') {
      setIsSearchActive(false);
    }
  }, [budgetVariant.type]);

  const handleShareWhatsApp = useCallback(async (budget: Budget) => {
    try {
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('Erro ao buscar orçamento:', error);
        const message = generateWhatsAppMessage({
          ...budget,
          part_quality: budget.part_quality || budget.part_type || 'Reparo'
        });
        shareViaWhatsApp(message);
      } else {
        const message = generateWhatsAppMessage({
          ...fullBudget,
          part_quality: fullBudget.part_quality || fullBudget.part_type || 'Reparo'
        });
        shareViaWhatsApp(message);
      }

      if (budgetVariant.type === 'enhanced') {
        showInfo('WhatsApp', 'Redirecionando para o WhatsApp...');
      } else {
        toast({
          title: "Redirecionando...",
          description: "Você será redirecionado para o WhatsApp.",
        });
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      if (budgetVariant.type === 'enhanced') {
        showError('Erro', 'Ocorreu um erro ao preparar o compartilhamento.');
      } else {
        toast({
          title: "Erro ao compartilhar",
          description: "Ocorreu um erro ao preparar o compartilhamento.",
          variant: "destructive",
        });
      }
    }
  }, [budgetVariant.type, toast, showInfo, showError]);

  const handleEdit = useCallback((budget: Budget) => {
    if (budgetVariant.type === 'enhanced') {
      onNavigateTo?.('edit-budget', budget.id);
    } else {
      setEditingBudget(budget);
    }
  }, [budgetVariant.type, onNavigateTo]);

  const handleDelete = useCallback(async (budgetIdOrBudget: string | Budget) => {
    const budgetId = typeof budgetIdOrBudget === 'string' ? budgetIdOrBudget : budgetIdOrBudget.id;
    
    try {
      if (budgetVariant.type === 'ios') {
        setUpdating(budgetId);
        
        const { data, error } = await supabase.rpc('soft_delete_budget_with_audit', {
          p_budget_id: budgetId,
          p_deletion_reason: 'Exclusão via interface mobile iOS'
        });

        if (error) {
          throw new Error(error.message || 'Erro ao excluir orçamento');
        }

        const response = data as any;
        if (!response?.success) {
          throw new Error(response?.error || 'Falha na exclusão do orçamento');
        }

        onRefresh();
        toast({
          title: "Orçamento removido",
          description: "O orçamento foi movido para a lixeira."
        });
      } else if (budgetVariant.type === 'enhanced') {
        showSuccess('Removido', 'Orçamento movido para a lixeira.');
      } else {
        await handleSingleDeletion({ budgetId });
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      if (budgetVariant.type === 'enhanced') {
        showError('Erro', 'Não foi possível remover o orçamento.');
      } else {
        toast({
          title: "Erro ao remover",
          description: "Não foi possível remover o orçamento.",
          variant: "destructive"
        });
      }
    } finally {
      if (budgetVariant.type === 'ios') {
        setUpdating(null);
      }
    }
  }, [budgetVariant.type, handleSingleDeletion, onRefresh, toast, showSuccess, showError]);

  // iOS specific handlers
  const handleSearchToggle = useCallback(() => {
    setIsSearchActive(!isSearchActive);
    if (isSearchActive) {
      setSearchTerm('');
    }
  }, [isSearchActive]);

  const handleViewPDF = useCallback(async (budget: Budget) => {
    try {
      setUpdating(budget.id);

      const pdfData = encodeURIComponent(JSON.stringify({
        id: budget.id,
        device_model: budget.device_model || 'Dispositivo',
        device_type: budget.device_type || 'Celular',
        part_quality: budget.part_type || 'Reparo',
        cash_price: budget.cash_price || budget.total_price || 0,
        client_name: budget.client_name,
        created_at: budget.created_at
      }));

      const safeUrl = SecureRedirect.getSafeRedirectUrl(`/print-budget?data=${pdfData}`);
      window.open(safeUrl, '_blank');

      toast({
        title: "PDF gerado!",
        description: "O PDF foi aberto em uma nova aba."
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o PDF. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setUpdating(null);
    }
  }, [toast]);

  const handleBudgetUpdate = useCallback((budgetId: string, updates: Partial<Budget>) => {
    setTimeout(() => {
      onRefresh();
    }, 500);
  }, [onRefresh]);

  // Enhanced specific handlers
  const handleRefreshWithFeedback = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      if (budgetVariant.type === 'enhanced') {
        showSuccess('Atualizado!', 'Lista de orçamentos atualizada.');
      }
    } catch (error) {
      if (budgetVariant.type === 'enhanced') {
        showError('Erro', 'Não foi possível atualizar a lista.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh, budgetVariant.type, showSuccess, showError]);

  const handleToggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const handleGeneratePDF = useCallback((budget: Budget) => {
    showInfo('PDF', 'Gerando PDF...');
  }, [showInfo]);

  // Enhanced FAB Actions
  const fabActions = budgetVariant.type === 'enhanced' ? createDefaultFABActions({
    onNewBudget: () => onNavigateTo?.('new-budget'),
    onSearch: () => document.getElementById('search-input')?.focus(),
    onFilter: handleToggleFilters,
    onSettings: () => onNavigateTo?.('settings'),
    onClients: () => onNavigateTo?.('clients')
  }) : [];

  const handleEditComplete = () => {
    setEditingBudget(null);
    onRefresh();
  };

  // Derived state for iOS
  const hasActiveSearch = searchTerm.trim().length > 0;
  const searchSubtitle = hasActiveSearch ? `${filteredBudgets.length} resultado(s) encontrado(s)` : `${budgets.length} orçamentos`;

  // Loading states
  if (loading && (budgetVariant.type !== 'enhanced' || !isRefreshing)) {
    if (budgetVariant.type === 'ios') {
      return (
        <div className="min-h-[100dvh] bg-background text-foreground">
          <div className="p-4 space-y-4">
            {[1, 2, 3].map(i => (
              <GlassCard key={i} className="p-4">
                <AdvancedSkeleton lines={3} avatar />
              </GlassCard>
            ))}
          </div>
        </div>
      );
    } else if (budgetVariant.type === 'enhanced') {
      return (
        <div className="p-4 space-y-4">
          <div className="h-16 bg-muted/30 rounded-2xl animate-pulse" />
          {Array.from({ length: 3 }).map((_, i) => (
            <BudgetCardSkeleton key={i} />
          ))}
        </div>
      );
    } else {
      return (
        <div className="p-4">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border rounded-lg p-4">
                <div className="animate-pulse space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-6 bg-muted rounded w-1/4"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  // Error states
  if (error) {
    const errorMessage = typeof error === 'string' ? error : String((error as any)?.message || 'Erro ao carregar orçamentos');
    
    if (budgetVariant.type === 'ios') {
      return (
        <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-sm">
            <div className="text-destructive text-6xl">⚠️</div>
            <p className="text-destructive text-lg">{errorMessage}</p>
            <button 
              onClick={onRefresh} 
              className="bg-primary hover:bg-primary/90 text-primary-foreground py-3 px-6 rounded-lg font-medium transition-colors w-full"
              style={{ touchAction: 'manipulation' }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    } else if (budgetVariant.type === 'enhanced') {
      return (
        <div className="flex items-center justify-center h-64 p-4">
          <div className="text-center">
            <p className="text-destructive mb-4">{errorMessage}</p>
            <Button onClick={handleRefreshWithFeedback}>
              Tentar Novamente
            </Button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="p-4">
          <div className="text-center space-y-4">
            <p className="text-red-600">{errorMessage}</p>
            <button
              onClick={onRefresh}
              className="bg-primary text-primary-foreground py-2 px-4 rounded-md text-sm font-medium"
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      );
    }
  }

  // Render based on variant
  if (budgetVariant.type === 'ios') {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground">
        <IOSContextualHeaderEnhanced
          title="Orçamentos"
          subtitle={searchSubtitle}
          onRefresh={onRefresh}
          isRefreshing={loading}
          showSearch={true}
          onSearchToggle={handleSearchToggle}
          searchActive={isSearchActive}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onSearchSubmit={() => {}}
          onSearchClear={handleClearSearch}
          searchPlaceholder="Buscar cliente ou dispositivo..."
          isSearching={false}
        />

        <div 
          className="overflow-auto" 
          style={{
            WebkitOverflowScrolling: 'touch',
            height: 'calc(100dvh - 140px)',
            overscrollBehavior: 'none',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)'
          }}
        >
          <div className="px-4 py-6">
            {filteredBudgets.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-7xl mb-6">📋</div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {hasActiveSearch ? 'Nenhum resultado' : 'Nenhum orçamento'}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {hasActiveSearch 
                    ? 'Tente ajustar sua busca' 
                    : 'Comece criando seu primeiro orçamento'
                  }
                </p>
                {hasActiveSearch && (
                  <div className="flex gap-3 justify-center">
                    <button 
                      onClick={handleClearSearch} 
                      className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium" 
                      style={{ touchAction: 'manipulation' }}
                    >
                      Limpar busca
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <StaggerContainer className="space-y-4">
                {filteredBudgets.map((budget) => (
                  <div 
                    key={budget.id} 
                    className={`transition-opacity duration-200 ${updating === budget.id ? 'opacity-50' : 'opacity-100'}`}
                    style={{
                      transform: 'translateZ(0)',
                      willChange: 'transform'
                    }}
                  >
                    <BudgetLiteCardiOS 
                      budget={budget} 
                      profile={profile} 
                      onShareWhatsApp={handleShareWhatsApp} 
                      onDelete={handleDelete} 
                      onBudgetUpdate={updates => handleBudgetUpdate(budget.id, updates)} 
                    />
                  </div>
                ))}
              </StaggerContainer>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (budgetVariant.type === 'enhanced') {
    return (
      <>
        <div className="min-h-screen bg-background">
          <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-xl border-b border-border/30">
            <div className="p-4 space-y-4" style={{ paddingTop: 'env(safe-area-inset-top, 16px)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Orçamentos</h1>
                  <p className="text-sm text-muted-foreground">
                    {filteredBudgets.length} {filteredBudgets.length === 1 ? 'item' : 'itens'}
                    {searchTerm && ` • "${searchTerm}"`}
                  </p>
                </div>
              </div>
              
              <UniversalSearchInput
                id="search-input"
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={handleClearSearch}
                onFilterToggle={handleToggleFilters}
                placeholder="Buscar por cliente, dispositivo ou serviço..."
                showFilter={true}
                hasActiveFilters={filterStatus !== 'all'}
              />
            </div>
          </div>

          <PullToRefresh onRefresh={handleRefreshWithFeedback} disabled={isRefreshing}>
            <div className="p-4 pb-24">
              {filteredBudgets.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-16"
                >
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    {searchTerm || filterStatus !== 'all' ? 'Nenhum resultado' : 'Nenhum orçamento'}
                  </h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Tente ajustar sua busca ou filtros' 
                      : 'Comece criando seu primeiro orçamento'
                    }
                  </p>
                  {!searchTerm && filterStatus === 'all' && (
                    <Button 
                      onClick={() => onNavigateTo?.('new-budget')}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Criar Primeiro Orçamento
                    </Button>
                  )}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {filteredBudgets.map((budget, index) => (
                      <motion.div
                        key={budget.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ 
                          duration: 0.3,
                          delay: Math.min(index * 0.05, 0.3)
                        }}
                      >
                        <EnhancedBudgetCard
                          budget={budget}
                          profile={profile}
                          onShareWhatsApp={handleShareWhatsApp}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onGeneratePDF={handleGeneratePDF}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </PullToRefresh>
        </div>

        <FloatingActionButton actions={fabActions} />

        <BottomSheet
          isOpen={showFilters}
          onClose={() => setShowFilters(false)}
          title="Filtros e Ordenação"
          snapPoints={[0.4, 0.6]}
        >
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-medium mb-3">Status</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'all', label: 'Todos' },
                  { value: 'pending', label: 'Pendente' },
                  { value: 'approved', label: 'Aprovado' },
                  { value: 'paid', label: 'Pago' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={filterStatus === option.value ? 'default' : 'outline'}
                    onClick={() => setFilterStatus(option.value)}
                    className="justify-start"
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-3">Ordenar por</h3>
              <div className="space-y-2">
                {[
                  { value: 'date' as const, label: 'Data de criação' },
                  { value: 'price' as const, label: 'Valor' },
                  { value: 'client' as const, label: 'Cliente' }
                ].map((option) => (
                  <Button
                    key={option.value}
                    variant={sortBy === option.value ? 'default' : 'ghost'}
                    onClick={() => setSortBy(option.value)}
                    className="w-full justify-start"
                  >
                    <SortAsc className="h-4 w-4 mr-2" />
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </BottomSheet>

        <IOSToastContainer toasts={toasts} onClose={removeToast} />
      </>
    );
  }

  // Standard variant
  return (
    <div className="p-4">
      <BudgetLiteSearch
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onClearSearch={handleClearSearch}
      />

      <div className="mb-4">
        <h3 className="text-lg font-semibold">
          {filteredBudgets.length} orçamento{filteredBudgets.length !== 1 ? 's' : ''}
          {searchTerm && ` encontrado${filteredBudgets.length !== 1 ? 's' : ''}`}
        </h3>
      </div>

      {filteredBudgets.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
          </p>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="mt-2 text-primary hover:underline text-sm"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBudgets.map(budget => (
            <BudgetLiteCard
              key={budget.id}
              budget={budget}
              profile={profile}
              onShareWhatsApp={handleShareWhatsApp}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onRefresh={onRefresh}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      <EditBudgetModal 
        budget={editingBudget} 
        open={!!editingBudget} 
        onOpenChange={(open) => {
          if (!open) {
            handleEditComplete();
          }
        }} 
      />
    </div>
  );
});