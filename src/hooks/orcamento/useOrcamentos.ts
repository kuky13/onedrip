import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface Budget {
  id: string;
  device_model?: string;
  device_type?: string;
  client_name?: string;
  client_phone?: string;
  part_type?: string;
  part_quality?: string;
  cash_price?: number;
  installment_price?: number;
  installments?: number;
  total_price?: number;
  warranty_months?: number;
  payment_condition?: string;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
  status?: string;
  workflow_status?: string;
  created_at?: string;
  valid_until?: string;
  issue?: string;
  notes?: string;
  owner_id?: string;
}

interface UseOrcamentosReturn {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  searchTerm: string;
  filteredBudgets: Budget[];
  setSearchTerm: (term: string) => void;
  refreshBudgets: () => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  getBudgetById: (budgetId: string) => Budget | undefined;
}

export const useOrcamentos = (): UseOrcamentosReturn => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar orçamentos baseado no termo de busca
  const filteredBudgets = budgets.filter(budget => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      budget.client_name?.toLowerCase().includes(searchLower) ||
      budget.device_model?.toLowerCase().includes(searchLower) ||
      budget.device_type?.toLowerCase().includes(searchLower) ||
      budget.part_type?.toLowerCase().includes(searchLower) ||
      budget.id.toLowerCase().includes(searchLower)
    );
  });

  // Carregar orçamentos do Supabase
  const loadBudgets = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;

      setBudgets(data || []);
    } catch (err: any) {
      console.error('Error loading budgets:', err);
      setError('Erro ao carregar orçamentos');
      showError({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar os orçamentos.'
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, showError]);

  // Atualizar lista de orçamentos
  const refreshBudgets = useCallback(async () => {
    setLoading(true);
    await loadBudgets();
  }, [loadBudgets]);

  // Excluir orçamento
  const deleteBudget = useCallback(async (budgetId: string) => {
    if (!user?.id) return;

    try {
      const { error: supabaseError } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('owner_id', user.id);

      if (supabaseError) throw supabaseError;

      // Remover da lista local
      setBudgets(prev => prev.filter(budget => budget.id !== budgetId));

      showSuccess({
        title: 'Orçamento excluído',
        description: 'O orçamento foi removido com sucesso.'
      });
    } catch (err: any) {
      console.error('Error deleting budget:', err);
      showError({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o orçamento.'
      });
      throw err;
    }
  }, [user?.id, showSuccess, showError]);

  // Buscar orçamento por ID
  const getBudgetById = useCallback((budgetId: string): Budget | undefined => {
    return budgets.find(budget => budget.id === budgetId);
  }, [budgets]);

  // Configurar subscription em tempo real
  useEffect(() => {
    if (!user?.id) return;

    // Carregar dados iniciais
    loadBudgets();

    // Configurar subscription para mudanças em tempo real
    const subscription = supabase
      .channel('budgets_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budgets',
          filter: `owner_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Budget change detected:', payload);
          
          if (payload.eventType === 'INSERT') {
            setBudgets(prev => [payload.new as Budget, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setBudgets(prev => 
              prev.map(budget => 
                budget.id === payload.new.id ? payload.new as Budget : budget
              )
            );
          } else if (payload.eventType === 'DELETE') {
            setBudgets(prev => 
              prev.filter(budget => budget.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, loadBudgets]);

  return {
    budgets,
    loading,
    error,
    searchTerm,
    filteredBudgets,
    setSearchTerm,
    refreshBudgets,
    deleteBudget,
    getBudgetById
  };
};