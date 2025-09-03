
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MessageCircle, FileText, Edit, Clock, Trash2, Zap, Copy, ExternalLink } from '@/components/ui/icons';
import { Checkbox } from '@/components/ui/checkbox';
import { useLayout } from '@/contexts/LayoutContext';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { BudgetStatusBadge } from './BudgetStatusBadge';
import { useAdvancedBudgets } from '@/hooks/useAdvancedBudgets';
import { useAuth } from '@/hooks/useAuth';
import { useSecureServiceOrders } from '@/hooks/useSecureServiceOrders';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface BudgetCardProps {
  budget: any;
  profile: any;
  isGenerating: boolean;
  isSelected: boolean;
  onSelect: (budgetId: string, isSelected: boolean) => void;
  onShareWhatsApp: (budget: any) => void;
  onViewPDF: (budget: any) => void;
  onEdit: (budget: any) => void;
  onDelete: (budget: any) => void;
}

const isBudgetOld = (createdAt: string, warningDays: number | undefined | null): boolean => {
  if (!createdAt || !warningDays) return false;
  const now = new Date();
  const budgetDate = new Date(createdAt);
  const diffTime = now.getTime() - budgetDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > warningDays;
};

export const BudgetCard = ({
  budget,
  profile,
  isGenerating,
  isSelected,
  onSelect,
  onShareWhatsApp,
  onViewPDF,
  onEdit,
  onDelete
}: BudgetCardProps) => {
  const { isMobile } = useLayout();
  const { isDesktop } = useResponsive();
  const { isAdvancedMode } = useAdvancedBudgets();
  const { profile: authProfile } = useAuth();
  const { createServiceOrderMutation } = useSecureServiceOrders();
  const { showSuccess, showError, showInfo } = useToast();
  const navigate = useNavigate();
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [createdOrderId, setCreatedOrderId] = useState<string | null>(null);
  const [formattedId, setFormattedId] = useState<string | null>(null);

  // Verificar se o usuário é VIP
  const isVipUser = authProfile?.service_orders_vip_enabled || false;
  
  // Debug: Log do status VIP
  console.log('🔍 [BudgetCard] Debug VIP Status:', {
    authProfile: authProfile,
    service_orders_vip_enabled: authProfile?.service_orders_vip_enabled,
    isVipUser: isVipUser,
    budgetId: budget.id
  });

  // Função para criar ordem de serviço automaticamente
  const handleCreateServiceOrder = async () => {
    if (!isVipUser) {
      showError('Esta funcionalidade está disponível apenas para usuários VIP.');
      return;
    }

    setIsCreatingOrder(true);
    
    try {
      const serviceOrderData = {
        device_model: budget.device_model || '',
        device_type: budget.device_type || '',
        client_name: budget.client_name || '',
        client_phone: budget.client_phone || '',
        client_email: budget.client_email || '',
        issue_description: budget.issue || '',
        estimated_price: budget.total_price || 0,
        notes: `Ordem criada automaticamente a partir do orçamento #${budget.id}`,
        budget_reference_id: budget.id
      };

      const result = await createServiceOrderMutation.mutateAsync(serviceOrderData);
      
      if (result?.id) {
        setCreatedOrderId(result.id);
        // Se o resultado incluir formatted_id, definir também
        if (result.formatted_id) {
          setFormattedId(result.formatted_id);
        }
        showSuccess('Ordem de serviço criada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao criar ordem de serviço:', error);
      showError('Erro ao criar ordem de serviço. Tente novamente.');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Função para copiar link de compartilhamento
  const handleCopyShareLink = () => {
    if (!createdOrderId) return;
    
    const shareUrl = `${window.location.origin}/share/service-order/${createdOrderId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      showSuccess('Link copiado para a área de transferência!');
    }).catch(() => {
      showError('Erro ao copiar link.');
    });
  };

  // Função para navegar para edição da ordem
  const handleEditOrder = () => {
    if (!createdOrderId) return;
    navigate(`/service-orders/${createdOrderId}/edit`);
  };

  // Verificação de segurança: não renderizar se o orçamento foi excluído
  if (!budget || !budget.id || budget.deleted_at) {
    console.warn('BudgetCard: budget inválido ou excluído:', budget);
    return null;
  }

  return (
    <Card className={cn(
      "group relative overflow-hidden border border-border/50 bg-gradient-to-br from-card/80 to-card/60 backdrop-blur-xl transition-all duration-300 hover:shadow-strong hover:border-primary/20 hover:scale-[1.02] hover:bg-gradient-to-br hover:from-card/90 hover:to-card/70",
      budget.deleted_at && "opacity-50 pointer-events-none",
      isDesktop && "desktop-card",
      "shadow-soft hover:shadow-medium"
    )}>
      <CardContent className={cn(
        "relative p-6 space-y-5",
        isDesktop && "desktop-content desktop-flex-row desktop-card-content"
      )}>
        {/* Header com checkbox e data */}
        <div className={cn(
          "flex items-start justify-between",
          isDesktop && "desktop-card-header"
        )}>
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors duration-200">
                {budget.device_model || 'Dispositivo não informado'}
              </h3>
              <Badge variant="outline" className="text-xs mt-1 border-primary/30 text-primary/80 bg-primary/5 hover:bg-primary/10 transition-colors">
                {budget.device_type || 'Tipo não informado'}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground/80 font-medium">
              {budget.created_at ? new Date(budget.created_at).toLocaleDateString('pt-BR') : 'Data não informada'}
            </span>
            {profile?.budget_warning_enabled && budget.created_at && isBudgetOld(budget.created_at, profile.budget_warning_days) && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Clock className="h-4 w-4 text-destructive" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Este orçamento tem mais de {profile.budget_warning_days} dias.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        {/* Informações do cliente */}
        {budget.client_name && (
          <div>
            <p className="text-sm text-primary font-semibold bg-primary/5 px-3 py-1.5 rounded-md border border-primary/20">
              Cliente: {budget.client_name}
            </p>
          </div>
        )}

        {/* Status Badge - Funcionalidades Avançadas */}
        {isAdvancedMode && (
          <div className="flex justify-start">
            <BudgetStatusBadge 
              status={budget.workflow_status || 'pending'}
              isPaid={budget.is_paid || false}
              isDelivered={budget.is_delivered || false}
              expiresAt={budget.expires_at}
            />
          </div>
        )}

        {/* Problema/Issue */}
        <div>
          <p className="text-sm text-muted-foreground font-medium mb-1">Serviço:</p>
          <p className="text-sm text-foreground/90 bg-muted/30 p-3 rounded-md border border-border/50">
            {budget.issue || 'Problema não informado'}
          </p>
        </div>

        <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Preço */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              R$ {((budget.total_price || 0) / 100).toLocaleString('pt-BR', {
                minimumFractionDigits: 2
              })}
            </p>
            {budget.installments > 1 && (
              <p className="text-xs text-muted-foreground/70 font-medium">{budget.installments}x</p>
            )}
          </div>
        </div>



        <Separator />

        {/* Botão VIP - Criar Ordem de Serviço */}
        {isVipUser && !createdOrderId && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-0">
                  VIP
                </Badge>
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                  Criar Ordem de Serviço
                </span>
              </div>
              <Button
                onClick={handleCreateServiceOrder}
                disabled={isCreatingOrder}
                size="sm"
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white border-0"
              >
                {isCreatingOrder ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Criar Automaticamente
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Botões de ação após criação da ordem */}
        {createdOrderId && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
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
              <Button
                onClick={handleEditOrder}
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Editar Ordem
              </Button>
              <Button
                onClick={handleCopyShareLink}
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-300 dark:hover:bg-green-950/20"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar Link
              </Button>
            </div>
          </div>
        )}

        {/* Botões de ação principais */}
        <div className={cn(
          "flex items-center justify-center gap-2 flex-wrap",
          isDesktop && "desktop-flex-row desktop-card-actions"
        )}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onShareWhatsApp(budget)} 
            className={cn(
              "flex items-center gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950 transition-all duration-150", 
              isMobile ? "h-10 px-3 text-sm" : "h-9"
            )}
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onViewPDF(budget)} 
            disabled={isGenerating} 
            className={cn(
              "flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950 transition-all duration-150 disabled:opacity-50", 
              isMobile ? "h-10 px-3 text-sm" : "h-9"
            )}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Ver PDF</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onEdit(budget)} 
            className={cn(
              "flex items-center gap-2 hover:bg-muted/20 hover:text-[#fec832] transition-all duration-150", 
              isMobile ? "h-10 px-3 text-sm" : "h-9"
            )}
          >
            <Edit className="h-4 w-4" />
            <span className="hidden sm:inline">Editar</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onDelete(budget)} 
            className={cn(
              "flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 transition-all duration-150", 
              isMobile ? "h-10 px-3 text-sm" : "h-9"
            )}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Excluir</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
