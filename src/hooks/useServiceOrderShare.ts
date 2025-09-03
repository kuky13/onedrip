import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ShareTokenData {
  share_token: string;
  share_url: string;
  expires_at: string;
}

export interface ServiceOrderShareData {
  id: string;
  formatted_id: string;
  device_type: string;
  device_model: string;
  reported_issue: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyInfo {
  name: string;
  logo_url: string | null;
  address: string | null;
  whatsapp_phone: string | null;
}

export function useServiceOrderShare() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const generateShareToken = async (serviceOrderId: string): Promise<ShareTokenData | null> => {
    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase
        .rpc('generate_service_order_share_token', {
          p_service_order_id: serviceOrderId
        });

      if (error) {
        console.error('Erro ao gerar token de compartilhamento:', error);
        toast.error('Erro ao gerar link de compartilhamento: ' + error.message);
        return null;
      }

      if (!data || data.length === 0) {
        toast.error('Não foi possível gerar o link de compartilhamento');
        return null;
      }

      const shareData = data[0] as ShareTokenData;
      toast.success('Link de compartilhamento gerado com sucesso!');
      
      return shareData;
    } catch (error) {
      console.error('Erro ao gerar token:', error);
      toast.error('Erro inesperado ao gerar link');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const getServiceOrderByToken = async (shareToken: string): Promise<ServiceOrderShareData | null> => {
    try {
      // Starting service order search with token
      
      const startTime = Date.now();
      const { data, error } = await supabase
        .rpc('get_service_order_by_share_token', {
          p_share_token: shareToken
        });
      
      const endTime = Date.now();
      // RPC call completed

      if (error) {
        console.error('❌ Erro ao buscar ordem de serviço:', error);
        throw new Error(`Erro ao buscar ordem de serviço: ${error.message}`);
      }

      if (!data || data.length === 0) {
        // No data returned from RPC
        throw new Error('Token de compartilhamento inválido ou expirado');
      }

      // Service order found
      return data[0] as ServiceOrderShareData;
    } catch (error) {
      console.error('💥 Erro geral ao buscar ordem de serviço:', error);
      throw error;
    }
  };

  const getCompanyInfoByToken = async (shareToken: string): Promise<CompanyInfo | null> => {
    try {
      // Fetching company information
      const { data, error } = await supabase
        .rpc('get_company_info_by_share_token', {
          p_share_token: shareToken
        });

      // Company info RPC response

      if (error) {
        console.error('❌ Erro ao buscar informações da empresa:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Company information found
      return data[0] as CompanyInfo;
    } catch (error) {
      console.error('💥 Erro geral ao buscar informações da empresa:', error);
      return null;
    }
  };

  const loadShareData = useCallback(async (shareToken: string): Promise<{ serviceOrder: ServiceOrderShareData | null; companyInfo: CompanyInfo | null }> => {
    try {
      setIsLoading(true);
      
      // Executa ambas as chamadas em paralelo
      const [serviceOrderData, companyInfoData] = await Promise.all([
        getServiceOrderByToken(shareToken),
        getCompanyInfoByToken(shareToken)
      ]);

      return {
        serviceOrder: serviceOrderData,
        companyInfo: companyInfoData
      };
    } catch (error) {
      console.error('💥 Erro ao carregar dados de compartilhamento:', error);
      return {
        serviceOrder: null,
        companyInfo: null
      };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Link copiado para a área de transferência!');
      return true;
    } catch (error) {
      console.error('Erro ao copiar para clipboard:', error);
      toast.error('Erro ao copiar link');
      return false;
    }
  };

  const shareViaWhatsApp = (shareUrl: string, deviceInfo?: string) => {
    const message = deviceInfo 
      ? `Olá! Você pode acompanhar o status do reparo do seu ${deviceInfo} através deste link: ${shareUrl}`
      : `Olá! Você pode acompanhar o status do seu reparo através deste link: ${shareUrl}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    window.open(whatsappUrl, '_blank');
  };

  return {
    generateShareToken,
    getServiceOrderByToken,
    getCompanyInfoByToken,
    loadShareData,
    copyToClipboard,
    shareViaWhatsApp,
    isGenerating,
    isLoading
  };
}