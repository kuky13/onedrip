import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { useBudgetDeletion } from '@/hooks/useBudgetDeletion';
import { useToast } from '@/hooks/useToast';
import { useIOSToast } from '@/components/ui/ios-optimized/IOSToast';
import { SecureRedirect } from '@/utils/secureRedirect';

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

interface BudgetOperationsConfig {
  variant: BudgetListVariant;
  onRefresh: () => void;
  onNavigateTo?: (view: string, id?: string) => void;
}

export const useBudgetOperations = ({ variant, onRefresh, onNavigateTo }: BudgetOperationsConfig) => {
  // State
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);

  // Conditional hooks based on variant
  const { handleSingleDeletion, isDeleting } = variant.type === 'standard' ? 
    useBudgetDeletion() : 
    { handleSingleDeletion: async () => {}, isDeleting: false };
  
  const { toast } = variant.type !== 'enhanced' ? useToast() : { toast: () => {} };
  
  const { showSuccess, showError, showInfo } = variant.type === 'enhanced' ? 
    useIOSToast() : 
    { showSuccess: () => {}, showError: () => {}, showInfo: () => {} };

  // WhatsApp sharing handler
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

      if (variant.type === 'enhanced') {
        showInfo('WhatsApp', 'Redirecionando para o WhatsApp...');
      } else {
        toast({
          title: "Redirecionando...",
          description: "Você será redirecionado para o WhatsApp.",
        });
      }
    } catch (error) {
      console.error('Error sharing via WhatsApp:', error);
      if (variant.type === 'enhanced') {
        showError('Erro', 'Ocorreu um erro ao preparar o compartilhamento.');
      } else {
        toast({
          title: "Erro ao compartilhar",
          description: "Ocorreu um erro ao preparar o compartilhamento.",
          variant: "destructive",
        });
      }
    }
  }, [variant.type, toast, showInfo, showError]);

  // Edit handler
  const handleEdit = useCallback((budget: Budget) => {
    if (variant.type === 'enhanced') {
      onNavigateTo?.('edit-budget', budget.id);
    } else {
      setEditingBudget(budget);
    }
  }, [variant.type, onNavigateTo]);

  // Delete handler with variant-specific logic
  const handleDelete = useCallback(async (budgetIdOrBudget: string | Budget) => {
    const budgetId = typeof budgetIdOrBudget === 'string' ? budgetIdOrBudget : budgetIdOrBudget.id;
    
    try {
      if (variant.type === 'ios') {
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
      } else if (variant.type === 'enhanced') {
        // Enhanced variant uses soft delete with audit
        setUpdating(budgetId);
        
        const { data, error } = await supabase.rpc('soft_delete_budget_with_audit', {
          p_budget_id: budgetId,
          p_deletion_reason: 'Exclusão via interface enhanced'
        });

        if (error) {
          throw new Error(error.message || 'Erro ao excluir orçamento');
        }

        const response = data as any;
        if (!response?.success) {
          throw new Error(response?.error || 'Falha na exclusão do orçamento');
        }

        onRefresh();
        showSuccess('Removido', 'Orçamento movido para a lixeira.');
      } else {
        // Standard variant uses hard delete
        await handleSingleDeletion({ budgetId });
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting budget:', error);
      if (variant.type === 'enhanced') {
        showError('Erro', 'Não foi possível remover o orçamento.');
      } else {
        toast({
          title: "Erro ao remover",
          description: "Não foi possível remover o orçamento.",
          variant: "destructive"
        });
      }
    } finally {
      if (variant.type === 'ios' || variant.type === 'enhanced') {
        setUpdating(null);
      }
    }
  }, [variant.type, handleSingleDeletion, onRefresh, toast, showSuccess, showError]);

  // PDF generation handler (iOS specific)
  const handleViewPDF = useCallback(async (budget: Budget) => {
    if (variant.type !== 'ios') return;
    
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
  }, [variant.type, toast]);

  // Enhanced PDF generation handler
  const handleGeneratePDF = useCallback((budget: Budget) => {
    if (variant.type === 'enhanced') {
      showInfo('PDF', 'Gerando PDF...');
      // TODO: Implement enhanced PDF generation
    }
  }, [variant.type, showInfo]);

  // Budget update handler
  const handleBudgetUpdate = useCallback((budgetId: string, updates: Partial<Budget>) => {
    // Debounced refresh to avoid excessive API calls
    setTimeout(() => {
      onRefresh();
    }, 500);
  }, [onRefresh]);

  // Edit completion handler
  const handleEditComplete = useCallback(() => {
    setEditingBudget(null);
    onRefresh();
  }, [onRefresh]);

  // Refresh with feedback (Enhanced variant)
  const handleRefreshWithFeedback = useCallback(async () => {
    if (variant.type !== 'enhanced') {
      onRefresh();
      return;
    }

    try {
      await onRefresh();
      showSuccess('Atualizado!', 'Lista de orçamentos atualizada.');
    } catch (error) {
      showError('Erro', 'Não foi possível atualizar a lista.');
    }
  }, [variant.type, onRefresh, showSuccess, showError]);

  return {
    // State
    updating,
    editingBudget,
    isDeleting,
    
    // Handlers
    handleShareWhatsApp,
    handleEdit,
    handleDelete,
    handleViewPDF,
    handleGeneratePDF,
    handleBudgetUpdate,
    handleEditComplete,
    handleRefreshWithFeedback,
    
    // Setters
    setEditingBudget,
    setUpdating
  };
};

// Helper function to get operation-specific configurations
export const getBudgetOperationConfig = (variant: BudgetListVariant) => {
  return {
    supportsSoftDelete: variant.type === 'ios' || variant.type === 'enhanced',
    supportsHardDelete: variant.type === 'standard',
    supportsPDFGeneration: variant.type === 'ios' || variant.type === 'enhanced',
    supportsAdvancedToasts: variant.type === 'enhanced',
    supportsEditModal: variant.type === 'standard' || variant.type === 'ios',
    supportsNavigationEdit: variant.type === 'enhanced',
    usesAuditTrail: variant.type === 'ios' || variant.type === 'enhanced'
  };
};