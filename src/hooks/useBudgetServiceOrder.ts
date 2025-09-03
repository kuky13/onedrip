/**
 * Hook para gerenciar estado persistente de ordem de serviço criada a partir de orçamento
 * Mantém o estado mesmo após recarregar a página
 */

import { useState, useEffect } from 'react';
import { storageManager } from '@/utils/localStorageManager';

interface BudgetServiceOrderData {
  createdOrderId: string;
  formattedId?: string;
  createdAt: string;
  budgetId: string;
}

export const useBudgetServiceOrder = (budgetId: string) => {
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [formattedId, setFormattedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chave para armazenar dados da ordem de serviço no localStorage
  const storageKey = `budget_service_order_${budgetId}`;

  // Carregar dados do localStorage na inicialização
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
          const parsedData: BudgetServiceOrderData = JSON.parse(storedData);
          
          // Verificar se os dados não expiraram (manter por 30 dias)
          const createdAt = new Date(parsedData.createdAt);
          const now = new Date();
          const daysDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= 30) {
            setCreatedOrderId(parsedData.createdOrderId);
            setFormattedId(parsedData.formattedId || null);
          } else {
            // Remover dados expirados
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da ordem de serviço:', error);
        localStorage.removeItem(storageKey);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, [budgetId, storageKey]);

  // Função para salvar ordem de serviço criada
  const saveCreatedOrder = (orderId: string, orderFormattedId?: string) => {
    try {
      const data: BudgetServiceOrderData = {
        createdOrderId: orderId,
        formattedId: orderFormattedId,
        createdAt: new Date().toISOString(),
        budgetId
      };

      localStorage.setItem(storageKey, JSON.stringify(data));
      setCreatedOrderId(orderId);
      setFormattedId(orderFormattedId || null);
    } catch (error) {
      console.error('Erro ao salvar dados da ordem de serviço:', error);
    }
  };

  // Função para limpar dados salvos
  const clearSavedOrder = () => {
    try {
      localStorage.removeItem(storageKey);
      setCreatedOrderId(null);
      setFormattedId(null);
    } catch (error) {
      console.error('Erro ao limpar dados da ordem de serviço:', error);
    }
  };

  // Função para verificar se há ordem criada
  const hasCreatedOrder = () => {
    return !!createdOrderId;
  };

  // Função para obter URL de compartilhamento
  const getShareUrl = () => {
    if (!createdOrderId) return null;
    return `${window.location.origin}/share/service-order/${createdOrderId}`;
  };

  return {
    createdOrderId,
    formattedId,
    isLoading,
    hasCreatedOrder: hasCreatedOrder(),
    saveCreatedOrder,
    clearSavedOrder,
    getShareUrl
  };
};