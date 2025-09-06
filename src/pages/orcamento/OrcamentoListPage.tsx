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
  const { user, profile } = useAuth();
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      {/* Professional Header */}
      <div className="relative bg-gradient-to-r from-card via-card/95 to-card border-b border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-7xl mx-auto p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                  <Plus className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Orçamentos
                  </h1>
                  <p className="text-muted-foreground">
                    Gerencie todos os seus orçamentos e propostas
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <TestPDFButton className="w-full sm:w-auto" />
              <Button 
                onClick={handleNewBudget} 
                className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-soft hover:shadow-medium transition-all duration-200"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Orçamento
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{budgets.length}</p>
                  <p className="text-sm text-muted-foreground">Total de Orçamentos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <Plus className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{budgets.filter(b => b.status === 'pending').length}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-accent/20 rounded-lg">
                  <Plus className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{budgets.filter(b => b.status === 'approved').length}</p>
                  <p className="text-sm text-muted-foreground">Aprovados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-muted/20 rounded-lg">
                  <Plus className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {budgets.reduce((acc, b) => acc + (b.cash_price || 0), 0) / 100}
                  </p>
                  <p className="text-sm text-muted-foreground">Valor Total (R$)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* PDF Test Component */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
          <CardContent className="p-6">
            <PDFTestComponent />
          </CardContent>
        </Card>

        {/* Search */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
          <CardContent className="p-6">
            <OrcamentoSearch
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              onClearSearch={handleClearSearch}
            />
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            {filteredBudgets.length} orçamento{filteredBudgets.length !== 1 ? 's' : ''}
            {searchTerm && ` encontrado${filteredBudgets.length !== 1 ? 's' : ''}`}
          </h3>
          {searchTerm && (
            <Button
              variant="outline"
              onClick={handleClearSearch}
              size="sm"
              className="text-primary hover:text-primary"
            >
              Limpar busca
            </Button>
          )}
        </div>

        {/* Budget grid */}
        {filteredBudgets.length === 0 ? (
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
            <CardContent className="p-12">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-medium">
                    {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum orçamento ainda'}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {searchTerm 
                      ? 'Tente ajustar sua busca ou limpar os filtros.'
                      : 'Crie seu primeiro orçamento para começar.'
                    }
                  </p>
                </div>
                {!searchTerm && (
                  <Button 
                    onClick={handleNewBudget}
                    className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Criar Primeiro Orçamento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBudgets.map(budget => (
              <div key={budget.id} className="transform transition-all duration-200 hover:scale-[1.02]">
                <OrcamentoCard
                  budget={budget}
                  profile={profile}
                  onShareWhatsApp={handleShareWhatsApp}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onViewDetails={handleViewDetails}
                  isDeleting={isDeleting}
                />
              </div>
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
    </div>
  );
};