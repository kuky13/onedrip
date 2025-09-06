import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';

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

interface UseOrcamentoActionsReturn {
  isGeneratingPDF: boolean;
  isDeleting: boolean;
  generatePDF: (budget: Budget) => Promise<void>;
  shareWhatsApp: (budget: Budget) => void;
  copyBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (budgetId: string) => Promise<void>;
  editBudget: (budgetId: string) => void;
  viewBudget: (budgetId: string) => void;
}

export const useOrcamentoActions = (): UseOrcamentoActionsReturn => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Gerar PDF do orçamento
  const generatePDF = useCallback(async (budget: Budget) => {
    if (!user?.id) return;

    setIsGeneratingPDF(true);

    try {
      // Buscar dados da empresa
      const { data: companyData, error: companyError } = await supabase
        .from('company_data')
        .select('*')
        .eq('owner_id', user.id)
        .single();

      if (companyError) {
        console.error('Company data error:', companyError);
        showError({
          title: 'Dados da empresa não encontrados',
          description: 'Configure os dados da sua empresa primeiro.'
        });
        return;
      }

      // Preparar dados para o PDF
      const pdfData = {
        budget,
        company: companyData,
        generatedAt: new Date().toISOString()
      };

      // Aqui você pode integrar com uma biblioteca de geração de PDF
      // Por exemplo, usando jsPDF ou uma API externa
      console.log('PDF Data:', pdfData);

      // Simular geração de PDF
      await new Promise(resolve => setTimeout(resolve, 2000));

      showSuccess({
        title: 'PDF gerado',
        description: 'O PDF do orçamento foi gerado com sucesso.'
      });

      // Aqui você faria o download do PDF ou abriria em nova aba
      // window.open(pdfUrl, '_blank');
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      showError({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o PDF do orçamento.'
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [user?.id, showSuccess, showError]);

  // Compartilhar via WhatsApp
  const shareWhatsApp = useCallback((budget: Budget) => {
    if (!budget.client_phone) {
      showError({
        title: 'Telefone não encontrado',
        description: 'O cliente não possui telefone cadastrado.'
      });
      return;
    }

    // Formatar telefone (remover caracteres especiais)
    const phone = budget.client_phone.replace(/\D/g, '');
    
    // Criar mensagem do orçamento
    const message = `Olá ${budget.client_name}! 👋\n\n` +
      `Segue o orçamento para o reparo do seu ${budget.device_type} ${budget.device_model}:\n\n` +
      `🔧 *Problema:* ${budget.issue}\n` +
      `🔩 *Peça:* ${budget.part_type} (${budget.part_quality})\n` +
      `💰 *Valor:* R$ ${budget.total_price?.toFixed(2)}\n` +
      `📅 *Garantia:* ${budget.warranty_months} meses\n` +
      `⏰ *Válido até:* ${budget.valid_until ? new Date(budget.valid_until).toLocaleDateString('pt-BR') : 'N/A'}\n\n` +
      `${budget.includes_delivery ? '🚚 Inclui entrega\n' : ''}` +
      `${budget.includes_screen_protector ? '🛡️ Inclui película\n' : ''}` +
      `${budget.notes ? `\n📝 *Observações:* ${budget.notes}\n` : ''}\n` +
      `Qualquer dúvida, estou à disposição! 😊`;

    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    showSuccess({
      title: 'WhatsApp aberto',
      description: 'A conversa foi aberta no WhatsApp.'
    });
  }, [showSuccess, showError]);

  // Copiar orçamento
  const copyBudget = useCallback(async (budget: Budget) => {
    if (!user?.id) return;

    try {
      // Criar cópia do orçamento sem o ID
      const { id, created_at, ...budgetCopy } = budget;
      
      const newBudget = {
        ...budgetCopy,
        client_name: `${budget.client_name} (Cópia)`,
        status: 'pending',
        workflow_status: 'budget_sent',
        owner_id: user.id
      };

      const { data, error } = await supabase
        .from('budgets')
        .insert(newBudget)
        .select()
        .single();

      if (error) throw error;

      // Copiar partes do orçamento se existirem
      if (budget.part_type && data) {
        const partData = {
          budget_id: data.id,
          part_name: budget.part_type,
          part_quality: budget.part_quality || 'original',
          price: budget.total_price || 0,
          warranty_months: budget.warranty_months || 3
        };

        const { error: partError } = await supabase
          .from('budget_parts')
          .insert(partData);
        
        if (partError) console.error('Error copying budget part:', partError);
      }

      showSuccess({
        title: 'Orçamento copiado',
        description: 'Uma cópia do orçamento foi criada com sucesso.'
      });
    } catch (err: any) {
      console.error('Error copying budget:', err);
      showError({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o orçamento.'
      });
    }
  }, [user?.id, showSuccess, showError]);

  // Excluir orçamento
  const deleteBudget = useCallback(async (budgetId: string) => {
    if (!user?.id) return;

    setIsDeleting(true);

    try {
      // Excluir partes do orçamento primeiro (devido à foreign key)
      const { error: partsError } = await supabase
        .from('budget_parts')
        .delete()
        .eq('budget_id', budgetId);

      if (partsError) console.error('Error deleting budget parts:', partsError);

      // Excluir orçamento
      const { error: budgetError } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetId)
        .eq('owner_id', user.id);

      if (budgetError) throw budgetError;

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
    } finally {
      setIsDeleting(false);
    }
  }, [user?.id, showSuccess, showError]);

  // Editar orçamento
  const editBudget = useCallback((budgetId: string) => {
    navigate(`/orcamento/editar/${budgetId}`);
  }, [navigate]);

  // Visualizar orçamento
  const viewBudget = useCallback((budgetId: string) => {
    navigate(`/orcamento/${budgetId}`);
  }, [navigate]);

  return {
    isGeneratingPDF,
    isDeleting,
    generatePDF,
    shareWhatsApp,
    copyBudget,
    deleteBudget,
    editBudget,
    viewBudget
  };
};