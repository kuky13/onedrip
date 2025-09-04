
import { useState, useCallback } from 'react';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/useToast';
import { useShareOptions } from '@/hooks/useShareOptions';

import { BudgetAction } from '../types';
import { useBudgetErrorHandler } from './useBudgetErrorHandler';

export const useBudgetActions = () => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const { handleAsyncError } = useBudgetErrorHandler();
  
  const [editingBudget, setEditingBudget] = useState<any>(null);
  const [deletingBudget, setDeletingBudget] = useState<any>(null);
  const [confirmation, setConfirmation] = useState<BudgetAction | null>(null);
  const [sharingBudget, setSharingBudget] = useState<any>(null);
  const [showShareSelector, setShowShareSelector] = useState(false);

  const handleShareWhatsApp = useCallback((budget: any) => {
    setSharingBudget(budget);
    setShowShareSelector(true);
  }, []);

  const closeShareSelector = useCallback(() => {
    setShowShareSelector(false);
    setSharingBudget(null);
  }, []);

  const onShareSuccess = useCallback(() => {
    showSuccess({
      title: "Compartilhado com sucesso!",
      description: "O orçamento foi compartilhado."
    });
  }, [showSuccess]);

  const onShareError = useCallback((error: Error) => {
    showError({
      title: "Erro ao compartilhar",
      description: error.message || "Ocorreu um erro ao compartilhar o orçamento."
    });
  }, [showError]);



  const handleEdit = useCallback((budget: any) => {
    setEditingBudget(budget);
  }, []);

  const handleDelete = useCallback((budget: any) => {
    setDeletingBudget(budget);
  }, []);

  const handleCopy = useCallback((budget: any) => {
    // Preparar dados para cópia (remover campos que não devem ser copiados)
    const copyData = {
      deviceType: budget.device_type,
      deviceModel: budget.device_model,
      issue: budget.issue,
      partType: budget.part_type,
      warrantyMonths: budget.warranty_months || 3,
      cashPrice: budget.cash_price ? (budget.cash_price / 100).toFixed(2) : '',
      installmentPrice: budget.installment_price ? (budget.installment_price / 100).toFixed(2) : '',
      installments: budget.installments || 1,
      includesDelivery: budget.includes_delivery || false,
      includesScreenProtector: budget.includes_screen_protector || false,
      enableInstallmentPrice: !!budget.installment_price,
      notes: budget.notes || '',
      validityDays: '15',
      paymentCondition: budget.payment_condition || 'À Vista',
      clientName: budget.client_name || '',
      clientPhone: budget.client_phone || ''
    };
    
    // Salvar dados no localStorage temporariamente
    localStorage.setItem('budgetCopyData', JSON.stringify(copyData));
    
    // Navegar para a página de novo orçamento
    navigate('/painel', { state: { activeTab: 'new-budget', copyFromBudget: true } });
    
    showSuccess({
      title: "Dados copiados!",
      description: "Os dados do orçamento foram copiados. Preencha os campos que desejar alterar."
    });
  }, [navigate, showSuccess]);

  const closeEdit = useCallback(() => {
    setEditingBudget(null);
  }, []);

  const closeDelete = useCallback(() => {
    setDeletingBudget(null);
  }, []);

  const closeConfirmation = useCallback(() => {
    setConfirmation(null);
  }, []);

  const confirmAction = useCallback(() => {
    if (confirmation) {
      confirmation.action();
      setConfirmation(null);
    }
  }, [confirmation]);

  return {
    editingBudget,
    deletingBudget,
    confirmation,
    sharingBudget,
    showShareSelector,
    handleShareWhatsApp,
    handleEdit,
    handleDelete,
    handleCopy,
    closeEdit,
    closeDelete,
    closeConfirmation,
    closeShareSelector,
    confirmAction,
    onShareSuccess,
    onShareError
  };
};
