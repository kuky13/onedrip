import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth.tsx';

export interface LicenseStatus {
  has_license: boolean;
  is_valid: boolean;
  license_code: string;
  expires_at: string | null;
  activated_at: string | null;
  days_remaining: number | null;
  message: string;
  requires_activation: boolean;
  requires_renewal: boolean;
  expired_at: string | null;
  validation_timestamp: string;
}

export interface UseLicenseReturn {
  licenseStatus: LicenseStatus | null;
  isLoading: boolean;
  error: string | null;
  refreshLicense: () => Promise<void>;
  hasValidLicense: boolean;
  isExpired: boolean;
  needsActivation: boolean;
  daysUntilExpiry: number | null;
}

export function useLicense(): UseLicenseReturn {
  const { user } = useAuth();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validateLicense = async () => {
    if (!user?.id) {
      setLicenseStatus(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase
        .rpc('get_user_license_status', {
          p_user_id: user.id
        });

      if (rpcError) {
        throw rpcError;
      }

      if (data) {
        // A função RPC retorna um objeto JSONB diretamente, não um array
        const licenseData = data as any;
        setLicenseStatus({
          has_license: licenseData.has_license || false,
          is_valid: licenseData.is_valid || false,
          license_code: licenseData.license_code || '',
          expires_at: licenseData.expires_at || null,
          activated_at: licenseData.activated_at || null,
          days_remaining: licenseData.days_remaining || null,
          message: licenseData.message || 'Status desconhecido',
          requires_activation: licenseData.requires_activation || false,
          requires_renewal: licenseData.requires_renewal || false,
          expired_at: licenseData.expired_at || null,
          validation_timestamp: licenseData.timestamp || new Date().toISOString()
        });
      } else {
        setLicenseStatus({
          has_license: false,
          is_valid: false,
          license_code: '',
          expires_at: null,
          activated_at: null,
          days_remaining: null,
          message: 'Nenhuma licença encontrada',
          requires_activation: true,
          requires_renewal: false,
          expired_at: null,
          validation_timestamp: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error('Erro ao validar licença:', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setLicenseStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    validateLicense();
  }, [user?.id]);

  const refreshLicense = async () => {
    await validateLicense();
  };

  const hasValidLicense = licenseStatus?.has_license === true && licenseStatus?.is_valid === true;
  const isExpired = licenseStatus?.requires_renewal === true;
  const needsActivation = licenseStatus?.requires_activation === true;
  const daysUntilExpiry = licenseStatus?.days_remaining || null;

  return {
    licenseStatus,
    isLoading,
    error,
    refreshLicense,
    hasValidLicense,
    isExpired,
    needsActivation,
    daysUntilExpiry
  };
}