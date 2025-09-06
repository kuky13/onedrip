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
  profile: Profile;
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 font-semibold text-xs sm:text-sm">
              {localBudget.client_name?.charAt(0)?.toUpperCase() || 'C'}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">{localBudget.client_name}</h3>
            <p className="text-xs sm:text-sm text-gray-500">{formatDate(localBudget.created_at)}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshBudgetData}
          disabled={isRefreshing}
          className="text-gray-500 hover:text-gray-700 flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0"
        >
          <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Mini Toast */}
      <MiniToastWithArrow 
        show={showToast} 
        message="Dados atualizados!" 
        onClose={() => setShowToast(false)} 
      />

      {/* Client Info */}
      <div className="mb-4 space-y-2">
        {localBudget.client_email && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">Email:</span>
            <span className="text-xs sm:text-sm text-gray-900 break-all">{localBudget.client_email}</span>
          </div>
        )}
        {localBudget.client_phone && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">Telefone:</span>
            <span className="text-xs sm:text-sm text-gray-900">{localBudget.client_phone}</span>
          </div>
        )}
      </div>

      {/* Status Badge - Advanced Features */}
      {profile?.advanced_features_enabled && (
        <div className="mb-3">
          <BudgetLiteStatusBadge 
            status={localBudget.workflow_status || 'pending'} 
            isPaid={localBudget.is_paid || false} 
            isDelivered={localBudget.is_delivered || false} 
            expiresAt={localBudget.expires_at} 
          />
        </div>
      )}

      {/* Service/Issue */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground font-medium mb-1">Serviço:</p>
        <p className="text-sm">{localBudget.issue || 'Problema não informado'}</p>
        <div className="w-full h-px bg-border mt-3"></div>
      </div>

      {/* Price */}
      <div className="mb-4 sm:mb-6">
        <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">
          {formatPrice(localBudget.total_price || 0)}
        </div>
        {localBudget.installments && localBudget.installments > 1 && (
          <div className="text-xs sm:text-sm text-gray-600">
            {localBudget.installments}x de {formatPrice(Math.round((localBudget.total_price || 0) / localBudget.installments))}
          </div>
        )}
        <div className="w-full h-px bg-border mt-3"></div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 sm:flex gap-2 pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(budget)}
          className="flex-1 h-9 text-xs sm:text-sm"
        >
          <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Ver</span>
          <span className="sm:hidden">Ver</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('whatsapp')}
          className="flex-1 h-9 text-xs sm:text-sm text-green-600 hover:text-green-700"
        >
          <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">WhatsApp</span>
          <span className="sm:hidden">Zap</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('pdf')}
          className="flex-1 h-9 text-xs sm:text-sm text-blue-600 hover:text-blue-700"
        >
          <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">PDF</span>
          <span className="sm:hidden">PDF</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(budget)}
          className="flex-1 h-9 text-xs sm:text-sm text-blue-600 hover:text-blue-700"
        >
          <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="hidden sm:inline">Editar</span>
          <span className="sm:hidden">Edit</span>
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => openDialog('delete')}
          disabled={isDeleting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50 h-9 px-2 sm:px-3 col-span-2 sm:col-span-1 sm:flex-none"
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
          <span className="ml-1 sm:hidden">Excluir</span>
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