import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLicenseVerificationOptimized } from '@/hooks/useLicenseVerificationOptimized';

/**
 * Hook que implementa redirecionamento automático baseado no status da licença
 * - Se a licença estiver ATIVA: redireciona para /painel
 * - Se a licença estiver DESATIVADA/INEXISTENTE: mantém na página atual
 * 
 * Funciona apenas na página /verify-licenca de forma silenciosa
 */
export const useAutoLicenseRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: licenseData, isLoading } = useLicenseVerificationOptimized(user?.id || null, {
    skipCache: false,
    enableRealtime: false
  });
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    // Só funciona na página de verificação de licença
    if (location.pathname !== '/verify-licenca') {
      return;
    }

    // Se não há usuário, não fazer nada
    if (!user?.id) {
      console.log('🔍 [AutoLicenseRedirect] Usuário não logado');
      return;
    }

    // Se ainda está carregando, aguardar
    if (isLoading) {
      console.log('🔍 [AutoLicenseRedirect] Carregando status da licença...');
      return;
    }

    // Evitar múltiplos redirecionamentos
    if (hasRedirectedRef.current) {
      return;
    }

    // Se a licença é válida e ativa, redirecionar para o painel
    if (licenseData?.has_license && licenseData?.is_valid) {
      console.log('✅ [AutoLicenseRedirect] Licença ativa detectada, redirecionando para /painel');
      hasRedirectedRef.current = true;
      navigate('/painel', { replace: true });
      return;
    }

    // Se a licença não é válida, log informativo mas manter na página
    if (licenseData) {
      console.log('🔍 [AutoLicenseRedirect] Licença inválida/inexistente, mantendo na página:', {
        has_license: licenseData.has_license,
        is_valid: licenseData.is_valid,
        requires_activation: licenseData.requires_activation,
        requires_renewal: licenseData.requires_renewal
      });
    }
  }, [location.pathname, user?.id, licenseData, isLoading, navigate]);

  // Reset do ref quando sair da página
  useEffect(() => {
    if (location.pathname !== '/verify-licenca') {
      hasRedirectedRef.current = false;
    }
  }, [location.pathname]);
};