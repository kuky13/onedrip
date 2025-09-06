import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useBudgetDeletion } from '@/hooks/useBudgetDeletion';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { OrcamentoSearch } from '@/components/orcamento/OrcamentoSearch';
import { OrcamentoCard } from '@/components/orcamento/OrcamentoCard';
import { EditBudgetModal } from '@/components/EditBudgetModal';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TestPDFButton from '@/components/orcamento/TestPDFButton';
import PDFTestComponent from '@/components/orcamento/PDFTestComponent';

export const OrcamentoListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { handleSingleDeletion, isDeleting } = useBudgetDeletion();
  
  const [budgets, setBudgets] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBudgets, setFilteredBudgets] = useState<any[]>([]);
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Carregar orçamentos
  const loadBudgets = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setBudgets(data || []);
    } catch (err: any) {
      console.error('Erro ao carregar orçamentos:', err);
      setError(err.message || 'Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadBudgets();
  }, [user?.id]);

  // Filtrar orçamentos quando o termo de busca ou orçamentos mudarem
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredBudgets(budgets);
    } else {
      const filtered = budgets.filter(budget => 
        budget.client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.device_model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.device_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        budget.part_quality?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredBudgets(filtered);
    }
  }, [searchTerm, budgets]);

  // Real-time subscription para atualizar dados automaticamente
  useEffect(() => {
    if (!user?.id) return;

    let debounceTimer: NodeJS.Timeout | null = null;
    
    const subscription = supabase
      .channel('budget_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escuta INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'budgets',
          filter: `owner_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('Budget change detected:', payload);
          
          // Clear previous timer
          if (debounceTimer) {
            clearTimeout(debounceTimer);
          }
          
          // Atualiza os dados quando houver mudanças
          debounceTimer = setTimeout(() => {
            loadBudgets();
            debounceTimer = null;
          }, 500);
        }
      )
      .subscribe();

    return () => {
      // Clear debounce timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      
      // Remove subscription properly
      supabase.removeChannel(subscription);
    };
  }, [user?.id]);

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleShareWhatsApp = async (budget: any) => {
    try {
      // Buscar dados completos do orçamento
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('Erro ao buscar orçamento:', error);
        // Fallback com dados básicos
        const message = generateWhatsAppMessage({
          ...budget,
          part_quality: budget.part_quality || budget.part_type || 'Reparo'
        });
        shareViaWhatsApp(message);
      } else {
        // Usar dados completos do banco
        const message = generateWhatsAppMessage({
          ...fullBudget,
          part_quality: fullBudget.part_quality || fullBudget.part_type || 'Reparo'
        });
        shareViaWhatsApp(message);
      }

      toast({
        title: "Redirecionando...",
        description: "Você será redirecionado para o WhatsApp.",
      });
    } catch (error) {
      toast({
        title: "Erro ao compartilhar",
        description: "Ocorreu um erro ao preparar o compartilhamento.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (budget: any) => {
    setEditingBudget(budget);
  };

  const handleDelete = async (budget: any) => {
    try {
      await handleSingleDeletion({ budgetId: budget.id });
      loadBudgets();
    } catch (error) {
      console.error('Erro ao deletar orçamento:', error);
    }
  };

  const handleEditComplete = () => {
    setEditingBudget(null);
    loadBudgets();
  };

  const handleViewDetails = (budget: any) => {
    navigate(`/orcamento/${budget.id}`);
  };

  const handleNewBudget = () => {
    navigate('/orcamento/novo');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
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

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="text-center space-y-4">
          <p className="text-red-600">{error}</p>
          <Button onClick={loadBudgets}>
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Orçamentos</h1>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <TestPDFButton className="w-full sm:w-auto" />
          <Button onClick={handleNewBudget} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Orçamento
          </Button>
        </div>
      </div>

      {/* PDF Test Component */}
      <div className="mb-6">
        <PDFTestComponent />
      </div>

      {/* Search */}
      <div className="mb-6">
        <OrcamentoSearch
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onClearSearch={handleClearSearch}
        />
      </div>

      {/* Results count */}
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-foreground">
          {filteredBudgets.length} orçamento{filteredBudgets.length !== 1 ? 's' : ''}
          {searchTerm && ` encontrado${filteredBudgets.length !== 1 ? 's' : ''}`}
        </h3>
      </div>

      {/* Budget grid */}
      {filteredBudgets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm sm:text-base">
            {searchTerm ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento cadastrado'}
          </p>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="mt-3 text-primary hover:underline text-sm transition-colors"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredBudgets.map(budget => (
            <OrcamentoCard
              key={budget.id}
              budget={budget}
              onShareWhatsApp={handleShareWhatsApp}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onViewDetails={handleViewDetails}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Modal de Edição */}
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
};