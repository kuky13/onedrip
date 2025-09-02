import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, Key, MessageCircle, AlertTriangle, CheckCircle, Phone, Mail, MapPin } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { useLicense } from '@/hooks/useLicense';


export const LicensePage = () => {
  const [licenseCode, setLicenseCode] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const {
    user
  } = useAuth();
  const {
    showSuccess,
    showError
  } = useToast();
  const navigate = useNavigate();
  const { 
    licenseStatus, 
    isLoading: licenseLoading, 
    refreshLicense, 
    hasValidLicense, 
    isExpired, 
    needsActivation,
    daysUntilExpiry 
  } = useLicense();
  
  // Custom revalidation function for license activation
  const revalidateAfterActivation = async () => {
    if (user?.id) {
      console.log('🔄 Revalidando licença após ativação...');
      
      // Wait for database to process activation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await refreshLicense();
      
      // Redirect to dashboard if license is valid
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
    }
  };
  const handleActivateLicense = async () => {
    if (!licenseCode.trim()) {
      showError({
        title: 'Código Obrigatório',
        description: 'Por favor, insira um código de licença válido.'
      });
      return;
    }
    if (!user?.id) {
      showError({
        title: 'Erro de Autenticação',
        description: 'Usuário não encontrado. Faça login novamente.'
      });
      return;
    }

    // Validar formato do código (13 caracteres alfanuméricos)
    if (licenseCode.length !== 13 || !/^[A-Z0-9]{13}$/.test(licenseCode)) {
      showError({
        title: 'Formato Inválido',
        description: 'O código deve ter exatamente 13 caracteres (letras e números).'
      });
      return;
    }
    setIsActivating(true);
    try {
      const {
        data,
        error
      } = await supabase.rpc('activate_license_enhanced', {
        license_code: licenseCode.trim(),
        p_user_id: user.id
      });
      if (error) {
        throw error;
      }
      const result = data as any;
      if (result?.success) {
        showSuccess({
          title: 'Licença Ativada!',
          description: result.message || 'Sua licença foi ativada com sucesso.'
        });

        // Revalidar licença e redirecionar automaticamente
        await revalidateAfterActivation();
      } else {
        const errorMessages = {
          'invalid_code': 'Código de licença inválido. Verifique e tente novamente.',
          'already_used': 'Esta licença já está sendo utilizada por outro usuário.',
          'expired': 'Esta licença está expirada. Entre em contato com o suporte.'
        };
        showError({
          title: 'Erro na Ativação',
          description: errorMessages[result?.error_type as keyof typeof errorMessages] || result?.error || 'Erro desconhecido.'
        });
      }
    } catch (error: any) {
      console.error('Error activating license:', error);
      showError({
        title: 'Erro Inesperado',
        description: 'Ocorreu um erro ao ativar a licença. Tente novamente.'
      });
    } finally {
      setIsActivating(false);
    }
  };
  const calculateExpiredDays = () => {
    if (!licenseStatus?.expired_at) return 0;
    
    // Se há uma data de expiração, vamos calcular
    const expiredDate = new Date(licenseStatus.expired_at);
    const today = new Date();
    const diffTime = today.getTime() - expiredDate.getTime();
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Se daysDiff for positivo, significa que já expirou
    return daysDiff > 0 ? daysDiff : 0;
  };

  const handleWhatsAppContact = () => {
    const expiredDays = calculateExpiredDays();
    const licenseCode = licenseStatus?.license_code || 'Não informado';
    
    let message = `Olá! Preciso de ajuda com minha licença do OneDrip.\n\nMeu email: ${user?.email || 'Não informado'}`;
    
    if (licenseStatus?.has_license && !licenseStatus?.is_valid && expiredDays > 0) {
      message += `\n\nMinha licença (${licenseCode}) está expirada há ${expiredDays} dias. Gostaria de renová-la.`;
    } else if (licenseStatus?.license_code) {
      message += `\n\nCódigo da licença atual: ${licenseCode}`;
    }
    
    const whatsappUrl = `https://wa.me/5564996028022?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };
  const handleEmailContact = () => {
    const expiredDays = calculateExpiredDays();
    const licenseCode = licenseStatus?.license_code || 'Não informado';
    
    let subject = 'Suporte - Licença OneDrip';
    let body = `Olá!\n\nPreciso de ajuda com minha licença do OneDrip.\n\nMeu email: ${user?.email || 'Não informado'}`;
    
    if (licenseStatus?.has_license && !licenseStatus?.is_valid && expiredDays > 0) {
      subject = 'Renovação de Licença - OneDrip';
      body += `\n\nMinha licença (${licenseCode}) está expirada há ${expiredDays} dias. Gostaria de renová-la.`;
    } else if (licenseStatus?.license_code) {
      body += `\n\nCódigo da licença atual: ${licenseCode}`;
    }
    
    const mailtoUrl = `mailto:contato@onedrip.com.br?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoUrl, '_blank');
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Header */}
        <div className="lg:col-span-2 text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {isExpired ? 'Licença Expirada' : 'Ativação de Licença'}
          </h1>
          <p className="text-muted-foreground">
            {isExpired 
              ? `Sua licença expirou há ${calculateExpiredDays()} dias. Entre em contato pelo WhatsApp para renovar ou ative um novo código abaixo.` 
              : 'Ative sua licença para ter acesso completo ao OneDrip'
            }
          </p>
          
          {/* Informações da Licença Atual - apenas se o usuário tiver licença */}
          {licenseStatus?.has_license && licenseStatus?.license_code && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-sm font-medium text-foreground mb-2">Licença Atual:</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-center items-center gap-2">
                  <span className="text-muted-foreground">Código:</span>
                  <span className="font-mono bg-muted px-2 py-1 rounded text-xs">
                    {licenseStatus.license_code}
                  </span>
                </div>
                {licenseStatus.expires_at && (
                  <div className="flex justify-center items-center gap-2">
                    <span className="text-muted-foreground">Data de Expiração:</span>
                    <span className="font-medium">
                      {new Date(licenseStatus.expires_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
                {licenseStatus.activated_at && (
                  <div className="flex justify-center items-center gap-2">
                    <span className="text-muted-foreground">Ativada em:</span>
                    <span>
                      {new Date(licenseStatus.activated_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* License Activation Card */}
        <Card className="shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
              <Key className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-xl">Ativar Licença</CardTitle>
            <p className="text-sm text-muted-foreground">
              Digite seu código de licença para ativar sua conta
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="license-code" className="text-sm font-medium text-foreground">
                Código da Licença
              </label>
              <Input id="license-code" type="text" placeholder="ABC123XYZ4567" value={licenseCode} onChange={e => setLicenseCode(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 13))} className="font-mono text-center tracking-wider" maxLength={13} />
              <p className="text-xs text-muted-foreground text-center">
                Formato: ABC123XYZ4567 (13 caracteres)
              </p>
            </div>

            <Button onClick={handleActivateLicense} disabled={isActivating || licenseCode.length !== 13} className="w-full">
              {isActivating ? 'Ativando...' : 'Ativar Licença'}
            </Button>

            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>Benefícios da Licença:</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Acesso completo ao sistema por 30 dias</li>
                  <li>• Suporte técnico via WhatsApp</li>
                  <li>• Todas as funcionalidades liberadas</li>
                  <li>• Atualizações automáticas</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Support Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-green-600" />
              Suporte e Contato
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Nossa equipe está pronta para ajudar você
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* WhatsApp */}
            <div className="space-y-3">
              <Button onClick={handleWhatsAppContact} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <MessageCircle className="mr-2 h-4 w-4" />
                Suporte via WhatsApp
              </Button>
              <p className="text-xs text-center text-muted-foreground">Resposta em até 1 hora (horário comercial)</p>
            </div>

            <Separator />

            {/* Contact Info */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Outros Contatos:</h4>
              
              <Button onClick={handleEmailContact} variant="outline" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                suporte@onedrip.email
              </Button>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>(64) 99602-8022</span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>Mineiros, GO - Brasil</span>
              </div>
            </div>

            <Separator />

            {/* Status Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="mr-1 h-3 w-3" />
                Suporte Ativo
              </Badge>
              <Badge variant="secondary" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                Seguro
              </Badge>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                <strong>
                  {isExpired 
                    ? `Sua licença expirou há ${calculateExpiredDays()} dias!` 
                    : 'Precisa de uma licença?'
                  }
                </strong> Entre em contato via WhatsApp para {isExpired ? 'renovar' : 'adquirir'} sua licença.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>;
};