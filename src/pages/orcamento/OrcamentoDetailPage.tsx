import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, FileText, MessageCircle, Copy, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { saveBudgetPDF, hasValidCompanyDataForPDF } from '@/utils/pdfUtils';
import { getCachedCompanyData, useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';

export const OrcamentoDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  // Carregar dados da empresa automaticamente
  const { hasMinimalData, isLoading: companyLoading } = useCompanyDataLoader();

  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleBack = () => {
    navigate('/orcamento');
  };

  const handleEdit = (budget: any) => {
    navigate(`/orcamento/edit/${budget.id}`);
  };

  const handleCopy = (budget: any) => {
    navigate('/orcamento/new', { state: { copyFrom: budget } });
  };

  const handleGeneratePDF = async () => {
    console.log('[OrcamentoDetailPage] ===== BOTÃO PDF CLICADO =====');
    console.log('[OrcamentoDetailPage] Budget existe:', !!budget);
    console.log('[OrcamentoDetailPage] companyLoading:', companyLoading);
    
    if (!budget || isGenerating) {
      console.log('[OrcamentoDetailPage] Budget não existe ou já gerando - retornando');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('[OrcamentoDetailPage] Botão PDF clicado - iniciando geração');
      // Debug: verificar estado dos dados
      console.log('[OrcamentoDetailPage] Estado dos dados da empresa:', {
        hasMinimalData,
        companyLoading,
        hasValidCompanyDataForPDF: hasValidCompanyDataForPDF(),
        cachedData: getCachedCompanyData()
      });
      
      // Verificar se temos dados da empresa
      if (companyLoading) {
        console.log('[OrcamentoDetailPage] Dados da empresa ainda carregando');
        showError({
          title: 'Carregando dados da empresa',
          description: 'Aguarde o carregamento dos dados da empresa.'
        });
        return;
      }
      
      // Debug: verificar dados da empresa
      console.log('[OrcamentoDetailPage] hasMinimalData:', hasMinimalData);
      const hasValidData = hasValidCompanyDataForPDF();
      console.log('[OrcamentoDetailPage] hasValidCompanyDataForPDF():', hasValidData);
      
      if (!hasMinimalData && !hasValidData) {
        console.log('[OrcamentoDetailPage] Dados da empresa insuficientes - mostrando erro');
        showError({
          title: 'Configure os dados da empresa antes de gerar o PDF',
          description: 'Acesse a página Empresa para configurar os dados necessários.'
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

  useEffect(() => {
    const loadBudget = async () => {
      if (!id || !user?.id) return;

      // Para teste: se o ID for 'test-budget-001', usar dados de teste
      if (id === 'test-budget-001') {
        console.log('[OrcamentoDetailPage] ===== PÁGINA CARREGADA - TESTE =====');
        console.log('[OrcamentoDetailPage] Carregando orçamento de teste');
        const testBudget = {
          id: 'test-budget-001',
          client_name: 'João Silva',
          client_email: 'joao@email.com',
          client_phone: '(11) 99999-9999',
          device_type: 'Smartphone',
          device_model: 'iPhone 12',
          part_type: 'Tela',
          part_quality: 'Original',
          cash_price: 35000, // 350.00 em centavos
          total_price: 35000,
          installment_price: 17500, // 175.00 em centavos
          installments: 2,
          created_at: new Date().toISOString(),
          valid_until: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
          warranty_months: 3,
          notes: 'Troca de tela com garantia',
          status: 'pendente',
          workflow_status: 'pending',
          owner_id: user.id
        };
        setBudget(testBudget);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('id', id)
          .eq('owner_id', user.id)
          .single();

        if (error) throw error;
        setBudget(data);
      } catch (error: any) {
        console.error('Error loading budget:', error);
        showError({
          title: 'Erro ao carregar',
          description: 'Não foi possível carregar o orçamento.'
        });
      } finally {
        setLoading(false);
      }
    };

    loadBudget();
  }, [id, user?.id, showError]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado':
        return 'bg-green-500/20 text-green-900 dark:text-green-200';
      case 'pendente':
        return 'bg-yellow-500/20 text-yellow-900 dark:text-yellow-200';
      case 'rejeitado':
        return 'bg-red-500/20 text-red-900 dark:text-red-200';
      default:
        return 'bg-gray-500/20 text-gray-900 dark:text-gray-200';
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

      handleBack();
    } catch (error: any) {
      console.error('Error deleting budget:', error);
      showError({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o orçamento.'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="flex items-center p-3 sm:p-4 border-b bg-card">
          <Button variant="ghost" onClick={handleBack} className="mr-2 h-8 w-8 sm:h-10 sm:w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Carregando...</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
          <div className="animate-pulse space-y-3 sm:space-y-4 w-full max-w-md">
            <div className="h-24 sm:h-32 bg-muted rounded-lg"></div>
            <div className="h-20 sm:h-24 bg-muted rounded-lg"></div>
            <div className="h-20 sm:h-24 bg-muted rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <div className="flex items-center p-3 sm:p-4 border-b bg-card">
          <Button variant="ghost" onClick={handleBack} className="mr-2 h-8 w-8 sm:h-10 sm:w-10 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Orçamento não encontrado</h1>
        </div>
        <div className="flex-1 flex items-center justify-center p-3 sm:p-4">
          <div className="text-center space-y-3 sm:space-y-4">
            <p className="text-sm sm:text-base text-muted-foreground">Este orçamento não foi encontrado.</p>
            <Button onClick={handleBack} className="h-9 sm:h-10 text-sm sm:text-base">Voltar</Button>
          </div>
        </div>
      </div>
    );
  }

  const createdDate = new Date(budget.created_at).toLocaleDateString('pt-BR');
  const validUntil = new Date(budget.valid_until).toLocaleDateString('pt-BR');
  const cashPrice = (budget.cash_price / 100).toLocaleString('pt-BR', { 
    minimumFractionDigits: 2,
    maximumFractionDigits: 2 
  });

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <div className="flex items-center justify-between p-3 sm:p-4 border-b bg-card">
        <div className="flex items-center min-w-0 flex-1">
          <Button variant="ghost" onClick={handleBack} className="mr-2 h-8 w-8 sm:h-10 sm:w-10 p-0 flex-shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Detalhes do Orçamento</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">#{budget.id.slice(0, 8)}</p>
          </div>
        </div>
        <div className="flex items-center ml-2 flex-shrink-0">
          <Badge className={`${getStatusColor(budget.status)} text-xs sm:text-sm`}>
            {budget.status}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        <Card className="border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <span>Informações Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Criado em</p>
                <p className="font-medium text-sm sm:text-base">{createdDate}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Válido até</p>
                <p className="font-medium text-sm sm:text-base">{validUntil}</p>
              </div>
            </div>
            {budget.client_name && (
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Cliente</p>
                <p className="font-medium text-sm sm:text-base">{budget.client_name}</p>
                {budget.client_phone && (
                  <p className="text-sm text-muted-foreground">{budget.client_phone}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <span>Dispositivo</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tipo</p>
              <p className="font-medium text-sm sm:text-base">{budget.device_type}</p>
            </div>
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Modelo</p>
              <p className="font-medium text-sm sm:text-base">{budget.device_model}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <span>Serviço</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Tipo de Serviço</p>
              <p className="font-medium text-sm sm:text-base">{budget.part_type}</p>
            </div>
            {budget.brand && (
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Qualidade da Peça</p>
                <p className="font-medium text-sm sm:text-base">{budget.brand}</p>
              </div>
            )}
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Garantia</p>
              <p className="font-medium text-sm sm:text-base">
                {budget.warranty_months} {budget.warranty_months === 1 ? 'mês' : 'meses'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center space-x-2 text-base sm:text-lg">
              <span>Valores</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3 px-3 sm:px-6 pt-3 sm:pt-6">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor à Vista</p>
              <p className="text-xl sm:text-2xl font-bold text-green-600">R$ {cashPrice}</p>
            </div>
            {budget.installment_price && budget.installments > 1 && (
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Valor Parcelado</p>
                <p className="font-medium text-sm sm:text-base">
                  R$ {(budget.installment_price / 100).toLocaleString('pt-BR', { 
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2 
                  })} em {budget.installments}x
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={() => handleEdit(budget)}
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
            >
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleCopy(budget)}
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              onClick={handleGeneratePDF}
              disabled={isGenerating}
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
            >
              <FileText className="h-4 w-4 mr-2" />
              {isGenerating ? 'Gerando...' : 'PDF'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleShareWhatsApp}
              className="w-full h-10 sm:h-11 text-sm sm:text-base"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </Button>
          </div>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            className="w-full h-10 sm:h-11 text-sm sm:text-base"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir Orçamento
          </Button>
        </div>

        <div className="pb-4"></div>
        </div>
      </div>
    </div>
  );
};