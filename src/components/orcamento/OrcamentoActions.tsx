import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreVertical, 
  Edit, 
  Copy, 
  FileText, 
  MessageCircle, 
  Trash2, 
  Eye 
} from 'lucide-react';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { saveBudgetPDF, hasValidCompanyDataForPDF } from '@/utils/pdfUtils';
import { getCachedCompanyData } from '@/hooks/useCompanyDataLoader';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

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
}

interface OrcamentoActionsProps {
  budget: Budget;
  onEdit?: (budget: Budget) => void;
  onCopy?: (budget: Budget) => void;
  onView?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
  variant?: 'dropdown' | 'buttons';
  showLabels?: boolean;
}

export const OrcamentoActions = ({
  budget,
  onEdit,
  onCopy,
  onView,
  onDelete,
  variant = 'dropdown',
  showLabels = false
}: OrcamentoActionsProps) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGeneratePDF = async () => {
    if (!budget || isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Verificar se temos dados da empresa no cache
      if (!hasValidCompanyDataForPDF()) {
        showError({
          title: 'Dados da empresa não encontrados',
          description: 'Aguarde o carregamento dos dados da empresa ou configure-os nas configurações.'
        });
        return;
      }

      // Preparar dados do orçamento para PDF
      const pdfData = {
        id: budget.id,
        device_model: budget.device_model || 'Dispositivo não informado',
        piece_quality: budget.part_quality || budget.part_type || 'Não informado',
        total_price: (budget.cash_price || budget.total_price || 0) / 100,
        installment_price: budget.installment_price ? budget.installment_price / 100 : undefined,
        installment_count: budget.installments || 1,
        created_at: budget.created_at,
        validity_date: budget.valid_until || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: budget.warranty_months || undefined,
        notes: budget.notes || budget.issue || undefined,
        includes_delivery: budget.includes_delivery === true,
        includes_screen_protector: budget.includes_screen_protector === true
      };

      // Usar dados da empresa do cache
      const companyData = getCachedCompanyData()?.getCompanyDataForPDF();
      
      await saveBudgetPDF(pdfData, companyData);
      
      showSuccess({
        title: 'PDF gerado com sucesso!',
        description: 'O arquivo foi baixado para seu dispositivo.'
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showError({
        title: 'Erro ao gerar PDF',
        description: 'Não foi possível gerar o PDF. Tente novamente.'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!budget) return;

    const message = generateWhatsAppMessage({
      id: budget.id,
      device_model: budget.device_model,
      device_type: budget.device_type || 'Smartphone',
      part_type: budget.part_type,
      part_quality: budget.part_quality || budget.part_type || 'Reparo geral',
      cash_price: budget.cash_price,
      installment_price: budget.installment_price,
      installments: budget.installments || 1,
      total_price: budget.total_price || budget.cash_price || 0,
      warranty_months: budget.warranty_months,
      payment_condition: budget.payment_condition || 'À vista',
      includes_delivery: budget.includes_delivery || false,
      includes_screen_protector: budget.includes_screen_protector || false,
      status: 'pending',
      workflow_status: budget.workflow_status || 'pending',
      created_at: budget.created_at,
      valid_until: budget.valid_until
    });

    shareViaWhatsApp(message);
  };

  const handleDelete = async () => {
    if (!budget) return;

    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budget.id)
        .eq('owner_id', user?.id);

      if (error) throw error;

      showSuccess({
        title: 'Orçamento excluído',
        description: 'O orçamento foi movido para a lixeira.'
      });

      onDelete?.(budget.id);
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      showError({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o orçamento.'
      });
    }
  };

  if (variant === 'buttons') {
    return (
      <div className="flex gap-2">
        {onView && (
          <Button variant="outline" size="sm" onClick={() => onView(budget)}>
            <Eye className="h-4 w-4" />
            {showLabels && <span className="ml-2">Ver</span>}
          </Button>
        )}
        {onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(budget)}>
            <Edit className="h-4 w-4" />
            {showLabels && <span className="ml-2">Editar</span>}
          </Button>
        )}
        {onCopy && (
          <Button variant="outline" size="sm" onClick={() => onCopy(budget)}>
            <Copy className="h-4 w-4" />
            {showLabels && <span className="ml-2">Copiar</span>}
          </Button>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleGeneratePDF}
          disabled={isGenerating}
        >
          <FileText className="h-4 w-4" />
          {showLabels && <span className="ml-2">{isGenerating ? 'Gerando...' : 'PDF'}</span>}
        </Button>
        <Button variant="outline" size="sm" onClick={handleShareWhatsApp}>
          <MessageCircle className="h-4 w-4" />
          {showLabels && <span className="ml-2">WhatsApp</span>}
        </Button>
        <Button variant="destructive" size="sm" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />
          {showLabels && <span className="ml-2">Excluir</span>}
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onView && (
          <DropdownMenuItem onClick={() => onView(budget)}>
            <Eye className="h-4 w-4 mr-2" />
            Ver detalhes
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={() => onEdit(budget)}>
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </DropdownMenuItem>
        )}
        {onCopy && (
          <DropdownMenuItem onClick={() => onCopy(budget)}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleGeneratePDF} disabled={isGenerating}>
          <FileText className="h-4 w-4 mr-2" />
          {isGenerating ? 'Gerando PDF...' : 'Gerar PDF'}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareWhatsApp}>
          <MessageCircle className="h-4 w-4 mr-2" />
          Compartilhar WhatsApp
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};