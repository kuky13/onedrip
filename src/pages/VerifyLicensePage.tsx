import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, AlertTriangle, ArrowLeft, Clock, Calendar, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLicenseVerificationOptimized } from '@/hooks/useLicenseVerificationOptimized';

export default function VerifyLicensePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Usar o hook otimizado para verificação de licença
  const { 
    data: licenseData, 
    isLoading, 
    error, 
    refetch 
  } = useLicenseVerificationOptimized(user?.id || null, {
    skipCache: true, // Sempre buscar dados frescos na página de verificação
    enableRealtime: false // Desabilitar WebSocket na página de verificação
  });

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Não informado';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  const getStatusIcon = () => {
    if (isLoading) return <Loader2 className="h-8 w-8 animate-spin text-blue-600" />;
    
    if (!licenseData?.has_license) {
      return <XCircle className="h-8 w-8 text-red-600" />;
    }
    
    if (licenseData.is_valid) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    
    return <AlertTriangle className="h-8 w-8 text-orange-600" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Verificando licença...';
    
    if (!licenseData?.has_license) {
      return 'Sem licença';
    }
    
    if (licenseData.is_valid) {
      return 'Licença Ativa';
    }
    
    if (licenseData.expired_at) {
      return 'Licença Expirada';
    }
    
    return 'Licença Desativada';
  };

  const getStatusColor = () => {
    if (isLoading) return 'text-blue-600';
    
    if (!licenseData?.has_license) {
      return 'text-red-600';
    }
    
    if (licenseData.is_valid) {
      return 'text-green-600';
    }
    
    return 'text-orange-600';
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Faça Login para Verificar</h2>
            <p className="text-gray-600 mb-4">Para verificar o status da sua licença, você precisa estar logado no sistema.</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/auth')} className="w-full">
                Fazer Login
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/')} 
                className="w-full"
              >
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Verificação de Licença</CardTitle>
            <p className="text-gray-600">
              Informações sobre sua licença do sistema
            </p>
          </CardHeader>
          
          <CardContent className="p-6">
            {/* Status da Licença */}
            <div className="text-center mb-8">
              {getStatusIcon()}
              <h2 className={`text-2xl font-bold mt-4 mb-2 ${getStatusColor()}`}>
                {getStatusText()}
              </h2>
              <p className="text-gray-600">
                {licenseData?.message || 'Verificando status...'}
              </p>
            </div>

            {/* Detalhes da Licença */}
            {licenseData?.has_license && (
              <div className="space-y-4 mb-6">
                {/* Código da Licença */}
                {licenseData.license_code && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Shield className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-700">Código da Licença:</span>
                    </div>
                    <span className="font-mono text-sm text-gray-900 bg-white px-3 py-1 rounded border">
                      {licenseData.license_code}
                    </span>
                  </div>
                )}

                {/* Data de Ativação */}
                {licenseData.activated_at && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-700">Ativada em:</span>
                    </div>
                    <span className="text-gray-900">
                      {formatDate(licenseData.activated_at)}
                    </span>
                  </div>
                )}

                {/* Data de Expiração */}
                {licenseData.expires_at && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <span className="font-medium text-gray-700">Expira em:</span>
                    </div>
                    <span className="text-gray-900">
                      {formatDate(licenseData.expires_at)}
                    </span>
                  </div>
                )}

                {/* Dias Restantes */}
                {licenseData.days_remaining !== null && licenseData.days_remaining !== undefined && (
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-blue-600" />
                      <span className="font-medium text-gray-700">Dias restantes:</span>
                    </div>
                    <span className={`font-semibold ${
                      licenseData.days_remaining > 30 ? 'text-green-600' :
                      licenseData.days_remaining > 7 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {licenseData.days_remaining}
                    </span>
                  </div>
                )}

                {/* Status da Validação */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Shield className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-700">Status:</span>
                  </div>
                  <span className={`font-semibold px-3 py-1 rounded text-sm ${
                    licenseData.is_valid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {licenseData.is_valid ? 'Válida' : 'Inválida'}
                  </span>
                </div>
              </div>
            )}

            {/* Alerta para licenças inativas */}
            {licenseData?.has_license && !licenseData?.is_valid && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-orange-800 mb-1">Licença Inativa</h3>
                    <p className="text-sm text-orange-700">
                      {licenseData.requires_renewal
                        ? 'Sua licença expirou e precisa ser renovada.' 
                        : 'Sua licença está desativada. Entre em contato com o suporte para reativá-la.'
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Alerta para usuários sem licença */}
            {!licenseData?.has_license && !isLoading && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-start space-x-3">
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-red-800 mb-1">Nenhuma Licença Encontrada</h3>
                    <p className="text-sm text-red-700">
                      Você não possui uma licença ativa. Entre em contato com o suporte para adquirir uma licença.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/painel')}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Painel
              </Button>
              
              <Button
                onClick={refetch}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  'Verificar Novamente'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}