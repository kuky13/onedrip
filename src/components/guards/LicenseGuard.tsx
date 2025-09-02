import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, Lock, Clock } from 'lucide-react';

interface LicenseGuardProps {
  children: React.ReactNode;
  requiresLicense?: boolean;
  fallbackPath?: string;
  showMessage?: boolean;
}

interface LicenseBlockedMessageProps {
  title: string;
  message: string;
  icon: React.ReactNode;
  actionText?: string;
  onAction?: () => void;
}

function LicenseBlockedMessage({ title, message, icon, actionText, onAction }: LicenseBlockedMessageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            {icon}
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-6 leading-relaxed">
          {message}
        </p>
        
        {actionText && onAction && (
          <button
            onClick={onAction}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            {actionText}
          </button>
        )}
        
        <div className="mt-4">
          <button
            onClick={() => window.location.href = '/licenca'}
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            Gerenciar Licença
          </button>
        </div>
      </div>
    </div>
  );
}

export function LicenseGuard({ 
  children, 
  requiresLicense = true, 
  fallbackPath = '/licenca',
  showMessage = true 
}: LicenseGuardProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { licenseStatus, isLoading: licenseLoading, hasValidLicense, isExpired, needsActivation } = useLicense();
  const location = useLocation();

  // Se não requer licença, renderiza o conteúdo
  if (!requiresLicense) {
    return <>{children}</>;
  }

  // Loading states
  if (authLoading || licenseLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Se não está autenticado, redireciona para login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Se tem licença válida, renderiza o conteúdo
  if (hasValidLicense) {
    return <>{children}</>;
  }

  // Se não deve mostrar mensagem, apenas redireciona
  if (!showMessage) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Determina qual mensagem mostrar baseado no status da licença
  if (needsActivation) {
    return (
      <LicenseBlockedMessage
        title="Licença Necessária"
        message="Para acessar esta funcionalidade, você precisa ativar uma licença válida. Entre em contato conosco para obter sua licença."
        icon={<Lock className="w-8 h-8 text-red-600" />}
        actionText="Ativar Licença"
        onAction={() => window.location.href = '/licenca'}
      />
    );
  }

  if (isExpired) {
    return (
      <LicenseBlockedMessage
        title="Licença Expirada"
        message="Sua licença expirou e precisa ser renovada para continuar acessando esta funcionalidade. Entre em contato conosco para renovar."
        icon={<Clock className="w-8 h-8 text-red-600" />}
        actionText="Renovar Licença"
        onAction={() => window.location.href = '/licenca'}
      />
    );
  }

  // Caso geral - licença inválida
  return (
    <LicenseBlockedMessage
      title="Acesso Restrito"
      message={licenseStatus?.message || "Você não possui uma licença válida para acessar esta funcionalidade."}
      icon={<AlertTriangle className="w-8 h-8 text-red-600" />}
      actionText="Verificar Licença"
      onAction={() => window.location.href = '/licenca'}
    />
  );
}

export default LicenseGuard;