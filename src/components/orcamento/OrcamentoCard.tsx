import React, { useState, useEffect, useCallback } from 'react';
import { MessageCircle, FileText, Edit, Trash2, RefreshCw, Eye } from 'lucide-react';
import { BudgetLiteStatusBadge } from '@/components/lite/BudgetLiteStatusBadge';
import { BudgetLiteActionDialog } from '@/components/lite/BudgetLiteActionDialog';
import { MiniToastWithArrow } from '@/components/lite/MiniToastWithArrow';
import { useIOSRefresh } from '@/hooks/useIOSRefresh';
import { Button } from '@/components/ui/button';
import { generateBudgetPDF, saveBudgetPDF, hasValidCompanyDataForPDF } from '@/utils/pdfUtils';
import { toast } from 'sonner';

interface Budget {
  id: string;
  device_model?: string;
  device_type?: string;
  client_name?: string;
  client_email?: string;
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
  created_at?: string;
  workflow_status?: string;
  is_paid?: boolean;
  is_delivered?: boolean;
  expires_at?: string;
  issue?: string;
  notes?: string;
  deleted_at?: string;
}

interface Profile {
  advanced_features_enabled?: boolean;
}

interface OrcamentoCardProps {
  budget: Budget;
  profile?: Profile;
  onShareWhatsApp: (budget: Budget) => void;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
  onViewDetails: (budget: Budget) => void;
  isDeleting?: boolean;
}

export const OrcamentoCard = ({
  budget,
  profile,
  onShareWhatsApp,
  onEdit,
  onDelete,
  onViewDetails,
  isDeleting = false
}: OrcamentoCardProps) => {
  const [localBudget, setLocalBudget] = useState(budget);
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'whatsapp' | 'pdf' | 'delete' | null;
    isLoading: boolean;
  }>({
    isOpen: false,
    type: null,
    isLoading: false
  });
  const [showToast, setShowToast] = useState(false);
  const {
    isRefreshing,
    refreshBudgetData
  } = useIOSRefresh({
    budgetId: budget?.id,
    onRefreshComplete: updatedBudget => {
      handleBudgetUpdate(updatedBudget);
    }
  });

  // Sincronizar estado local com prop budget
  useEffect(() => {
    setLocalBudget(budget);
  }, [budget]);

  if (!localBudget || !localBudget.id || localBudget.deleted_at) {
    return null;
  }

  const handleBudgetUpdate = (updates: Partial<Budget>) => {
    setLocalBudget((prev: Budget) => ({
      ...prev,
      ...updates
    }));
  };

  const openDialog = (type: 'whatsapp' | 'pdf' | 'delete') => {
    setDialogState({
      isOpen: true,
      type,
      isLoading: false
    });
  };

  const closeDialog = () => {
    setDialogState({
      isOpen: false,
      type: null,
      isLoading: false
    });
  };

  const showErrorToast = useCallback((message: string) => {
    toast.error(message);
  }, []);

  const showSuccessToast = useCallback((message: string) => {
    toast.success(message);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    setDialogState(prev => ({
      ...prev,
      isLoading: true
    }));

    try {
      switch (dialogState.type) {
        case 'whatsapp':
          await onShareWhatsApp(localBudget);
          break;
        case 'pdf':
          await handleGeneratePDF();
          break;
        case 'delete':
          await onDelete(budget);
          break;
      }
      closeDialog();
      setShowToast(true);
    } catch (error) {
      console.error('Erro ao executar ação:', error);
      showErrorToast('Erro ao executar ação. Tente novamente.');
      setDialogState(prev => ({
        ...prev,
        isLoading: false
      }));
    }
  }, [dialogState.type, localBudget, budget, onShareWhatsApp, onDelete, showErrorToast]);

  const handleGeneratePDF = useCallback(async () => {
    try {
      // Verificar se temos dados da empresa válidos
      if (!hasValidCompanyDataForPDF()) {
        showErrorToast('Configure os dados da empresa antes de gerar o PDF.');
        return;
      }

      // Validar campos obrigatórios
      const clientName = localBudget.client_name?.trim() || '';
      if (!clientName || clientName.length < 2) {
        showErrorToast('Nome do cliente é obrigatório para gerar o PDF.');
        return;
      }

      if (!localBudget.total_price || localBudget.total_price <= 0) {
        showErrorToast('Valor total é obrigatório para gerar o PDF.');
        return;
      }

      // Validar se há informações suficientes sobre o serviço/reparo
      const hasServiceInfo = localBudget.part_type || localBudget.part_quality || localBudget.device_type;
      if (!hasServiceInfo) {
        showErrorToast('Informações sobre o tipo de serviço ou peça são obrigatórias para gerar o PDF.');
        return;
      }

      // Mapear dados do orçamento para a interface BudgetData esperada pelo pdfUtils
      const pdfData = {
        id: localBudget.id,
        client_name: localBudget.client_name.trim(),
        client_email: localBudget.client_email || '',
        client_phone: localBudget.client_phone || '',
        device_type: localBudget.device_type || 'Smartphone',
        device_model: localBudget.device_model || 'Dispositivo não informado',
        part_type: localBudget.part_type || '',
        part_quality: localBudget.part_quality || localBudget.part_type || 'Reparo geral',
        total_price: (localBudget.cash_price || localBudget.total_price || 0) / 100, // Converter de centavos para reais
        installment_price: localBudget.installment_price ? localBudget.installment_price / 100 : undefined,
        installments: localBudget.installments || 1,
        created_at: localBudget.created_at,
        warranty_months: localBudget.warranty_months || 12,
        notes: localBudget.notes || localBudget.issue || '',
        includes_delivery: localBudget.includes_delivery || false,
        includes_screen_protector: localBudget.includes_screen_protector || false
      };

      console.log('=== GERAÇÃO DE PDF DO ORÇAMENTO ===');
      console.log('Dados do orçamento:', pdfData);

      await saveBudgetPDF(pdfData);
      
      showSuccessToast('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showErrorToast('Erro ao gerar PDF. Tente novamente.');
      throw error;
    }
  }, [localBudget, showSuccessToast, showErrorToast]);

  const formatPrice = (price: number) => {
    return (price / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="group bg-gradient-to-br from-card to-card/50 border border-border/50 rounded-xl p-6 hover:shadow-medium transition-all duration-300 hover:border-primary/20 hover:bg-gradient-to-br hover:from-card hover:to-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center flex-shrink-0 border border-primary/20">
            <span className="text-primary font-semibold text-sm">
              {localBudget.client_name?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground text-base truncate group-hover:text-primary transition-colors duration-200">
              {localBudget.client_name || 'Cliente'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {localBudget.created_at ? formatDate(localBudget.created_at) : 'Data não informada'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshBudgetData}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-primary flex-shrink-0 h-8 w-8 p-0 hover:bg-primary/10 transition-all duration-200"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Mini Toast */}
      <MiniToastWithArrow 
        show={showToast} 
        message="Dados atualizados!" 
        onClose={() => setShowToast(false)} 
      />

      {/* Device & Service Info */}
      <div className="mb-4 space-y-3">
        {localBudget.device_model && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary/40 rounded-full" />
            <span className="text-sm text-foreground font-medium">
              {localBudget.device_model}
            </span>
          </div>
        )}
        
        {(localBudget.part_type || localBudget.issue) && (
          <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground font-medium mb-1">Serviço:</p>
            <p className="text-sm text-foreground">
              {localBudget.part_type || localBudget.issue || 'Serviço não especificado'}
            </p>
          </div>
        )}

        {localBudget.client_phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            <span>{localBudget.client_phone}</span>
          </div>
        )}
      </div>

      {/* Status Badge - Advanced Features */}
      {profile?.advanced_features_enabled && (
        <div className="mb-4">
          <BudgetLiteStatusBadge 
            status={localBudget.workflow_status || 'pending'} 
            isPaid={localBudget.is_paid || false} 
            isDelivered={localBudget.is_delivered || false} 
            expiresAt={localBudget.expires_at} 
          />
        </div>
      )}

      {/* Price Section */}
      <div className="mb-6 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
        <div className="text-center">
          <div className="text-2xl font-bold text-foreground mb-1">
            {formatPrice(localBudget.cash_price || localBudget.total_price || 0)}
          </div>
          {localBudget.installments && localBudget.installments > 1 && (
            <div className="text-sm text-muted-foreground">
              {localBudget.installments}x de {formatPrice(Math.round((localBudget.cash_price || localBudget.total_price || 0) / localBudget.installments))}
            </div>
          )}
          {localBudget.warranty_months && (
            <div className="text-xs text-primary font-medium mt-1">
              Garantia: {localBudget.warranty_months} {localBudget.warranty_months === 1 ? 'mês' : 'meses'}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(budget)}
          className="h-10 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200"
        >
          <Eye className="h-4 w-4 mr-2" />
          Visualizar
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('whatsapp')}
          className="h-10 border-border/50 hover:border-success/50 hover:bg-success/5 hover:text-success transition-all duration-200"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('pdf')}
          className="h-10 border-border/50 hover:border-primary/50 hover:bg-primary/5 hover:text-primary transition-all duration-200"
        >
          <FileText className="h-4 w-4 mr-2" />
          Gerar PDF
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(budget)}
          className="h-10 border-border/50 hover:border-accent/50 hover:bg-accent/5 hover:text-accent transition-all duration-200"
        >
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Delete Button - Separate row for emphasis */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('delete')}
          disabled={isDeleting}
          className="w-full h-9 text-destructive border-destructive/20 hover:bg-destructive/5 hover:border-destructive/50 disabled:opacity-50 transition-all duration-200"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {isDeleting ? 'Excluindo...' : 'Excluir Orçamento'}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <BudgetLiteActionDialog 
        isOpen={dialogState.isOpen} 
        onClose={closeDialog} 
        onConfirm={handleConfirmAction} 
        type={dialogState.type!} 
        deviceModel={budget.device_model} 
        clientName={budget.client_name} 
        isLoading={dialogState.isLoading} 
      />
    </div>
  );
};