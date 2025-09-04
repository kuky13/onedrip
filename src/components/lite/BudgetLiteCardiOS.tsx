import React, { useState } from 'react';
import { generateWhatsAppMessage, shareViaWhatsApp } from '@/utils/whatsappUtils';
import { generateBudgetPDF, saveBudgetPDF, type CompanyData } from '@/utils/pdfUtils';
import { MessageCircle, FileText, Edit, Trash2, Eye, Share, X, Mail, Download, Zap, ExternalLink, Copy } from 'lucide-react';
import { BudgetLiteStatusBadge } from './BudgetLiteStatusBadge';
import { BudgetEditFormIOS } from './BudgetEditFormIOS';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useShopProfile } from '@/hooks/useShopProfile';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { useIOSFeedback } from './IOSFeedback';
interface Budget {
  id: string;
  client_name?: string;
  device_model?: string;
  device_type?: string;
  issue?: string;
  total_price?: number;
  cash_price?: number;
  installment_price?: number;
  part_quality?: string;
  part_type?: string;
  workflow_status?: string;
  is_paid?: boolean;
  is_delivered?: boolean;
  expires_at?: string;
  approved_at?: string;
  payment_confirmed_at?: string;
  delivery_confirmed_at?: string;
  created_at: string;
  installments?: number;
}
interface BudgetLiteCardiOSProps {
  budget: Budget;
  profile: any;
  onShareWhatsApp: (budget: Budget) => void;
  onDelete: (budgetId: string) => void;
  onBudgetUpdate?: (updates: Partial<Budget>) => void;
}
export const BudgetLiteCardiOS = ({
  budget,
  profile,
  onShareWhatsApp,
  onDelete,
  onBudgetUpdate
}: BudgetLiteCardiOSProps) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const {
    shopProfile
  } = useShopProfile();
  const {
    companyInfo
  } = useCompanyBranding();
  const {
    hapticFeedback,
    showSuccessAction,
    showErrorAction,
    showProgressAction
  } = useIOSFeedback();

  // Verificar se o usuário é VIP
  const isVipUser = profile?.service_orders_vip_enabled || false;
  const serviceOrdersVipEnabled = profile?.service_orders_vip_enabled || false;
  

  


  // Função para criar ordem de serviço automaticamente
  const handleCreateServiceOrder = async () => {
    if (!budget?.id || !profile?.id) return;
    
    setIsCreatingOrder(true);
    try {
      const { data, error } = await supabase
        .from('service_orders')
        .insert({
          owner_id: profile.id,
          device_model: budget.device_model || 'Dispositivo não informado',
          device_type: budget.device_type || 'Smartphone',
          reported_issue: budget.issue || 'Problema não informado',
          total_price: (budget.total_price || 0) / 100, // Converter de centavos para reais
          status: 'pending',
          priority: 'medium'
        })
        .select()
        .single();

      if (error) throw error;
      
      setCreatedOrderId(data.id);
      showSuccessAction('Ordem de serviço criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      showErrorAction('Erro ao criar ordem de serviço');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Função para editar ordem de serviço
  const handleEditOrder = () => {
    if (createdOrderId) {
      window.open(`/service-orders/${createdOrderId}/edit`, '_blank');
    }
  };

  // Função para copiar link de compartilhamento
  const handleCopyShareLink = async () => {
    if (createdOrderId) {
      const shareLink = `${window.location.origin}/share/service-order/${createdOrderId}`;
      try {
        await navigator.clipboard.writeText(shareLink);
        showSuccessAction('Link copiado para a área de transferência!');
      } catch (error) {
        console.error('Erro ao copiar link:', error);
        showErrorAction('Erro ao copiar link');
      }
    }
  };

  if (!budget || !budget.id) {
    return null;
  }
  const formatPrice = (price: number) => {
    return (price / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(budget.id);
    } finally {
      setIsDeleting(false);
    }
  };
  const handleEdit = () => {
    setIsEditModalOpen(true);
  };
  const handleWhatsAppShare = async () => {
    if (isSharing) return;
    try {
      setIsSharing(true);
      hapticFeedback('light');
      showProgressAction('Preparando mensagem...');

      // Buscar dados completos do orçamento
      const {
        data: fullBudget,
        error
      } = await supabase.from('budgets').select('*').eq('id', budget.id).single();
      if (error) {
        console.error('Erro ao buscar orçamento:', error);
        // Fallback com dados básicos
        const message = generateWhatsAppMessage({
          id: budget.id,
          device_model: budget.device_model || 'Dispositivo',
          device_type: budget.device_type || 'Smartphone',
          part_type: budget.part_type || 'Reparo',
          part_quality: budget.part_quality || 'Reparo geral',
          cash_price: budget.total_price || 0,
          installment_price: budget.total_price || 0,
          installments: budget.installments || 1,
          total_price: budget.total_price || 0,
          warranty_months: 3,
          payment_condition: 'Cartão de Crédito',
          includes_delivery: false,
          includes_screen_protector: false,
          status: 'pending',
          workflow_status: budget.workflow_status || 'pending',
          created_at: budget.created_at,
          valid_until: budget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
        });
        shareViaWhatsApp(message);
        showSuccessAction('Redirecionando para WhatsApp');
        return;
      }

      // Usar dados completos do banco
      const message = generateWhatsAppMessage({
        id: fullBudget.id,
        device_model: fullBudget.device_model || 'Dispositivo',
        device_type: fullBudget.device_type || 'Smartphone',
        part_type: fullBudget.part_type || 'Reparo',
        part_quality: fullBudget.part_quality || fullBudget.part_type || 'Reparo geral',
        cash_price: fullBudget.cash_price || fullBudget.total_price || 0,
        installment_price: fullBudget.installment_price || fullBudget.total_price || 0,
        installments: fullBudget.installments || 1,
        total_price: fullBudget.total_price || 0,
        warranty_months: fullBudget.warranty_months || 3,
        payment_condition: fullBudget.payment_condition || 'Cartão de Crédito',
        includes_delivery: fullBudget.includes_delivery || false,
        includes_screen_protector: fullBudget.includes_screen_protector || false,
        delivery_date: fullBudget.delivery_date,
        notes: fullBudget.notes,
        status: fullBudget.status || 'pending',
        workflow_status: fullBudget.workflow_status || 'pending',
        created_at: fullBudget.created_at,
        valid_until: fullBudget.valid_until || fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        expires_at: fullBudget.expires_at
      });
      shareViaWhatsApp(message);
      showSuccessAction('Redirecionando para WhatsApp');
    } catch (error) {
      console.error('Erro ao compartilhar WhatsApp:', error);
      showErrorAction('Não foi possível compartilhar');
    } finally {
      setIsSharing(false);
    }
  };
  const handleGeneratePDF = async () => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    try {
      hapticFeedback('light');
      showProgressAction('Gerando PDF...');

      console.log('[PDF] Iniciando geração de PDF...');
      console.log('[PDF] Dados do perfil da loja:', shopProfile);
      console.log('[PDF] Dados da empresa:', companyInfo);

      // Verificar se temos dados mínimos necessários
      if (!shopProfile && !companyInfo) {
        console.warn('[PDF] Nenhum dado da empresa disponível');
        showErrorAction('Dados da empresa não carregados. Tente novamente.');
        return;
      }

      // Buscar dados completos do orçamento do banco
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('[PDF] Erro ao buscar dados completos do orçamento:', error);
        showErrorAction('Erro ao carregar dados do orçamento');
        return;
      }

      // Preparar dados do orçamento seguindo a interface BudgetData com dados completos
      const pdfData = {
        id: fullBudget.id,
        device_model: fullBudget.device_model || 'Dispositivo não informado',
        piece_quality: fullBudget.part_quality || fullBudget.part_type || 'Não informado',
        total_price: (fullBudget.cash_price || fullBudget.total_price || 0) / 100,
        // Converter de centavos para reais
        installment_price: fullBudget.installment_price ? fullBudget.installment_price / 100 : undefined,
        installment_count: fullBudget.installments || 1,
        created_at: fullBudget.created_at,
        validity_date: fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: fullBudget.warranty_months || undefined,
        notes: fullBudget.notes || fullBudget.issue || undefined,
        includes_delivery: fullBudget.includes_delivery === true,
        includes_screen_protector: fullBudget.includes_screen_protector === true
      };
      
      // Preparar dados da empresa com fallbacks robustos
      const companyData: CompanyData = {
        shop_name: shopProfile?.shop_name || companyInfo?.name || 'Minha Loja',
        address: shopProfile?.address || companyInfo?.address || '',
        contact_phone: shopProfile?.contact_phone || companyInfo?.whatsapp_phone || companyInfo?.phone || '',
        logo_url: shopProfile?.logo_url || companyInfo?.logo_url || '',
        email: companyInfo?.email || '',
        cnpj: shopProfile?.cnpj || ''
      };
      
      console.log('[PDF] Dados da empresa preparados:', companyData);
      
      await saveBudgetPDF(pdfData, companyData);
      showSuccessAction('PDF gerado com sucesso!');
    } catch (error) {
      console.error('[PDF] Erro ao gerar PDF:', error);
      if (error instanceof Error) {
        showErrorAction(`Erro: ${error.message}`);
      } else {
        showErrorAction('Não foi possível gerar o PDF');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  const handlePDFClick = () => {
    setShowShareOptions(true);
  };
  const handleSharePDF = async (shareType: 'native' | 'whatsapp' | 'email' | 'download') => {
    if (isGeneratingPDF) return;
    setIsGeneratingPDF(true);
    setShowShareOptions(false);
    try {
      hapticFeedback('light');
      showProgressAction('Gerando PDF...');

      console.log('[PDF] Iniciando compartilhamento de PDF...');
      console.log('[PDF] Tipo de compartilhamento:', shareType);
      console.log('[PDF] Dados do perfil da loja:', shopProfile);
      console.log('[PDF] Dados da empresa:', companyInfo);

      // Verificar se temos dados mínimos necessários
      if (!shopProfile && !companyInfo) {
        console.warn('[PDF] Nenhum dado da empresa disponível para compartilhamento');
        showErrorAction('Dados da empresa não carregados. Tente novamente.');
        return;
      }

      // Buscar dados completos do orçamento do banco
      const { data: fullBudget, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budget.id)
        .single();

      if (error) {
        console.error('[PDF] Erro ao buscar dados completos do orçamento:', error);
        showErrorAction('Erro ao carregar dados do orçamento');
        return;
      }

      // Preparar dados do orçamento com dados completos
      const pdfData = {
        id: fullBudget.id,
        device_model: fullBudget.device_model || 'Dispositivo não informado',
        piece_quality: fullBudget.part_quality || fullBudget.part_type || 'Não informado',
        total_price: (fullBudget.cash_price || fullBudget.total_price || 0) / 100,
        installment_price: fullBudget.installment_price ? fullBudget.installment_price / 100 : undefined,
        installment_count: fullBudget.installments || 1,
        created_at: fullBudget.created_at,
        validity_date: fullBudget.expires_at || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        warranty_months: fullBudget.warranty_months || undefined,
        notes: fullBudget.notes || fullBudget.issue || undefined,
        includes_delivery: fullBudget.includes_delivery === true,
        includes_screen_protector: fullBudget.includes_screen_protector === true
      };
      
      // Preparar dados da empresa com fallbacks robustos
      const companyData: CompanyData = {
        shop_name: shopProfile?.shop_name || companyInfo?.name || 'Minha Loja',
        address: shopProfile?.address || companyInfo?.address || '',
        contact_phone: shopProfile?.contact_phone || companyInfo?.whatsapp_phone || companyInfo?.phone || '',
        logo_url: shopProfile?.logo_url || companyInfo?.logo_url || '',
        email: companyInfo?.email || '',
        cnpj: shopProfile?.cnpj || ''
      };
      
      console.log('[PDF] Dados da empresa preparados para compartilhamento:', companyData);
      const pdfBlob = await generateBudgetPDF(pdfData, companyData);
      if (shareType === 'native' && navigator.share) {
        // Usar Web Share API nativa
        const file = new File([pdfBlob], `orcamento-${budget.id}.pdf`, {
          type: 'application/pdf'
        });
        await navigator.share({
          title: `Orçamento - ${budget.device_model}`,
          text: `Orçamento para ${budget.device_model}`,
          files: [file]
        });
        showSuccessAction('PDF compartilhado!');
      } else if (shareType === 'whatsapp') {
        // Compartilhar via WhatsApp (download + mensagem)
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${budget.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);

        // Abrir WhatsApp com mensagem
        const message = `Segue o orçamento para ${budget.device_model}. Valor: ${formatPrice(budget.cash_price || budget.total_price || 0)}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        showSuccessAction('PDF baixado e WhatsApp aberto!');
      } else if (shareType === 'email') {
        // Compartilhar via email
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orcamento-${budget.id}.pdf`;
        link.click();
        URL.revokeObjectURL(url);
        const subject = `Orçamento - ${budget.device_model}`;
        const body = `Segue em anexo o orçamento para ${budget.device_model}.\n\nValor: ${formatPrice(budget.cash_price || budget.total_price || 0)}`;
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
        showSuccessAction('PDF baixado e email aberto!');
      } else {
        // Download direto usando a função auxiliar
        await saveBudgetPDF(pdfData, companyData);
        showSuccessAction('PDF baixado com sucesso!');
      }
    } catch (error) {
      console.error('[PDF] Erro ao compartilhar PDF:', error);
      if (error instanceof Error) {
        showErrorAction(`Erro ao compartilhar: ${error.message}`);
      } else {
        showErrorAction('Não foi possível compartilhar o PDF');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  return <div className="bg-card border border-border rounded-2xl p-5 shadow-soft transition-all duration-200 active:scale-[0.98]" style={{
    // Otimizações para performance no iOS
    transform: 'translateZ(0)',
    WebkitBackfaceVisibility: 'hidden',
    WebkitTransform: 'translate3d(0,0,0)'
  }}>
      {/* Header Completo */}
      <div className="mb-4">
        <div className="flex items-start justify-between mb-2">
          
          
        </div>
        
      </div>

      {/* Status Badge - Advanced Features */}
      {profile?.advanced_features_enabled && <div className="mb-4">
          <BudgetLiteStatusBadge status={budget.workflow_status as any || 'pending'} isPaid={budget.is_paid || false} isDelivered={budget.is_delivered || false} expiresAt={budget.expires_at} />
        </div>}

      {/* Detalhes Completos do Orçamento */}
      <div className="space-y-3 mb-5">
        {/* Serviço/Problema */}
        <div className="bg-muted/30 rounded-lg p-3">
          <p className="text-xs text-muted-foreground font-medium mb-1">Serviço/Dispositivo:</p>
          <p className="text-card-foreground leading-relaxed font-medium">
            {budget.device_model || 'Dispositivo não informado'}
          </p>
        </div>

        {/* Informações do Dispositivo */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">QUALIDADE:</p>
            <p className="text-sm text-card-foreground font-medium">
              {budget.part_quality || budget.part_type || 'Não informado'}
            </p>
          </div>
          <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">APARELHO:</p>
            <p className="text-sm text-card-foreground font-medium">
              {budget.device_type || 'Não informado'}
            </p>
          </div>
        </div>

        {/* Cliente */}
        {budget.client_name && <div className="bg-muted/20 rounded-lg p-3">
            <p className="text-xs text-muted-foreground font-medium mb-1">CLIENTE:</p>
            <p className="text-sm text-card-foreground font-medium">
              {budget.client_name}
            </p>
          </div>}

        {/* Preço e Parcelamento */}
        <div className="bg-primary/5 rounded-xl border border-primary/10 p-4">
          <div className="space-y-3">
            {/* Valor à vista */}
            <div>
              <p className="text-xs text-primary/70 font-medium mb-1">VALOR À VISTA:</p>
              <p className="text-2xl font-bold text-primary">
                {formatPrice(budget.cash_price || budget.total_price || 0)}
              </p>
            </div>
            
            {/* Valor parcelado - só aparece se houver parcelamento */}
            {budget.installments && budget.installments > 1 && budget.installment_price && <div className="pt-2 border-t border-primary/10">
                <p className="text-xs text-primary/70 font-medium mb-1">VALOR PARCELADO:</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-bold text-primary">
                    {formatPrice(budget.installment_price)}
                  </p>
                  <p className="text-sm text-primary/70">
                    em {budget.installments}x
                  </p>
                </div>
              </div>}
          </div>
        </div>



        {/* Datas Importantes */}
        <div className="space-y-2">
          {budget.expires_at && <div className="bg-muted/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground font-medium mb-1">EXPIRA EM:</p>
              <p className="text-sm text-card-foreground font-medium">
                {formatDate(budget.expires_at)}
              </p>
            </div>}
        </div>
      </div>

      {/* Seção VIP - Criar Ordem de Serviço */}
      {isVipUser && !createdOrderId && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0">
                VIP
              </Badge>
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Criar Ordem de Serviço
              </span>
            </div>
            <button
              onClick={handleCreateServiceOrder}
              disabled={isCreatingOrder}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-400 disabled:to-indigo-400 text-white py-2 px-4 rounded-lg font-medium transition-all duration-200 active:scale-95"
              style={{
                minHeight: '40px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              {isCreatingOrder ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span className="text-sm">Criando...</span>
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  <span className="text-sm">Criar</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Botões de ação após criação da ordem */}
      {createdOrderId && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-xl border border-green-200 dark:border-green-800 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0">
                ✓ Ordem Criada
              </Badge>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                ID: {createdOrderId.slice(0, 8)}...
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleEditOrder}
              className="flex items-center gap-2 border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20 py-2 px-3 rounded-lg font-medium transition-all duration-200 active:scale-95"
              style={{
                minHeight: '36px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">Editar</span>
            </button>
            <button
              onClick={handleCopyShareLink}
              className="flex items-center gap-2 border border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20 py-2 px-3 rounded-lg font-medium transition-all duration-200 active:scale-95"
              style={{
                minHeight: '36px',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              <Copy className="h-4 w-4" />
              <span className="text-sm">Copiar Link</span>
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons - Diretas e intuitivas para iOS */}
      <div className="flex justify-center gap-3 pt-4">
        {/* WhatsApp - Ação direta */}
        <button onClick={handleWhatsAppShare} disabled={isSharing} className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-95" style={{
        minHeight: '48px',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}>
          <MessageCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {isSharing ? 'Compartilhando...' : 'WhatsApp'}
          </span>
        </button>

        {/* PDF - Ação com compartilhamento */}
        <button onClick={handlePDFClick} disabled={isGeneratingPDF} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 px-4 rounded-xl font-medium transition-all duration-200 active:scale-95" style={{
        minHeight: '48px',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}>
          <FileText className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm font-medium">
            {isGeneratingPDF ? 'Gerando...' : 'PDF'}
          </span>
        </button>
      </div>

      {/* Secondary Actions - Compactas */}
      <div className="flex justify-center gap-4 pt-3">
        <button onClick={handleEdit} className="flex items-center gap-2 text-muted-foreground hover:text-accent py-2 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200" style={{
        minHeight: '40px',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent'
      }}>
          <Edit className="h-4 w-4" />
          <span className="text-sm">Editar</span>
        </button>
        
        {/* Delete com Confirmação mínima */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-destructive py-2 px-3 rounded-lg hover:bg-muted/50 transition-all duration-200" style={{
            minHeight: '40px',
            touchAction: 'manipulation',
            WebkitTapHighlightColor: 'transparent'
          }} disabled={isDeleting}>
              <Trash2 className="h-4 w-4" />
              <span className="text-sm">Excluir</span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-sm mx-auto">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-lg">Excluir?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm">
                Este orçamento será movido para a lixeira.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex gap-3">
              <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Modal de Opções de Compartilhamento */}
      {showShareOptions && <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setShowShareOptions(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full max-w-md p-6 space-y-4 animate-in slide-in-from-bottom duration-300" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Compartilhar PDF</h3>
            <button onClick={() => setShowShareOptions(false)} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
            
            {/* Opções de Compartilhamento */}
            <div className="space-y-3">
              {/* Compartilhar - Genérico para qualquer app */}
              <button onClick={() => handleSharePDF('native')} className="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                <Share className="h-6 w-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Compartilhar</p>
                  <p className="text-sm text-gray-600">Escolher aplicativo</p>
                </div>
              </button>
              
              {/* Download */}
              <button onClick={() => handleSharePDF('download')} className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
                <Download className="h-6 w-6 text-gray-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">Download</p>
                  <p className="text-sm text-gray-600">Baixar PDF</p>
                </div>
              </button>
              
            </div>
          </div>
        </div>}

      {/* Modal de Edição */}
      <BudgetEditFormIOS budget={budget} isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onBudgetUpdate={onBudgetUpdate} />
    </div>;
};