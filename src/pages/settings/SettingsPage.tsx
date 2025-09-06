import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdaptiveLayout } from '@/components/adaptive/AdaptiveLayout';
import { BudgetErrorBoundary, AuthErrorBoundary } from '@/components/ErrorBoundaries';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { PageTransition } from '@/components/ui/animations/page-transitions';
import { IOSSpinner } from '@/components/ui/animations/loading-states';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Settings, User, Bell, Shield, Palette, Globe, Save } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import SupportButton from '@/components/SupportButton';
import { cn } from '@/lib/utils';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  
  // Estado para controlar se está pronto para renderizar
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados para configurações
  const [settings, setSettings] = useState({
    // Configurações de perfil
    displayName: '',
    email: '',
    phone: '',
    
    // Configurações de notificação
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    
    // Configurações de aparência
    darkMode: false,
    language: 'pt-BR',
    
    // Configurações de privacidade
    profileVisibility: true,
    dataSharing: false,
    
    // Configurações de sistema
    autoSave: true,
    backupEnabled: true
  });
  
  useEffect(() => {
    if (user?.id && profile) {
      setIsReady(true);
      // Carregar configurações do usuário
      setSettings(prev => ({
        ...prev,
        displayName: profile.full_name || '',
        email: user.email || '',
        phone: profile.phone || ''
      }));
    }
  }, [user?.id, profile]);
  
  const handleNavigateBack = () => {
    navigate('/dashboard');
  };
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Simular salvamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Configurações salvas",
        description: "Suas configurações foram atualizadas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  if (!isReady) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            Carregando configurações...
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <AuthErrorBoundary>
      <BudgetErrorBoundary>
        <LayoutProvider>
          <AdaptiveLayout>
            <PageTransition type="slideLeft">
              <div className="min-h-screen bg-background">
                {/* Header com breadcrumb */}
                <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleNavigateBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                      </Button>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span 
                          className="cursor-pointer hover:text-foreground transition-colors"
                          onClick={() => navigate('/dashboard')}
                        >
                          Dashboard
                        </span>
                        <span>/</span>
                        <span className="text-foreground font-medium">
                          Configurações
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo principal */}
                <div className="container mx-auto px-4 py-6">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Settings className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">Configurações</h1>
                        <p className="text-muted-foreground">
                          Personalize sua experiência no aplicativo
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "grid gap-6",
                    isDesktop ? "grid-cols-2" : "grid-cols-1"
                  )}>
                    {/* Configurações de Perfil */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <User className="h-5 w-5 text-blue-600" />
                          Perfil
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="displayName">Nome de exibição</Label>
                          <Input
                            id="displayName"
                            value={settings.displayName}
                            onChange={(e) => handleSettingChange('displayName', e.target.value)}
                            placeholder="Seu nome"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email}
                            onChange={(e) => handleSettingChange('email', e.target.value)}
                            placeholder="seu@email.com"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input
                            id="phone"
                            value={settings.phone}
                            onChange={(e) => handleSettingChange('phone', e.target.value)}
                            placeholder="(11) 99999-9999"
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Configurações de Notificação */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <Bell className="h-5 w-5 text-green-600" />
                          Notificações
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Notificações por email</Label>
                            <p className="text-sm text-muted-foreground">
                              Receba atualizações por email
                            </p>
                          </div>
                          <Switch
                            checked={settings.emailNotifications}
                            onCheckedChange={(checked) => handleSettingChange('emailNotifications', checked)}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Notificações push</Label>
                            <p className="text-sm text-muted-foreground">
                              Receba notificações no navegador
                            </p>
                          </div>
                          <Switch
                            checked={settings.pushNotifications}
                            onCheckedChange={(checked) => handleSettingChange('pushNotifications', checked)}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Notificações por SMS</Label>
                            <p className="text-sm text-muted-foreground">
                              Receba SMS importantes
                            </p>
                          </div>
                          <Switch
                            checked={settings.smsNotifications}
                            onCheckedChange={(checked) => handleSettingChange('smsNotifications', checked)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Configurações de Aparência */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <Palette className="h-5 w-5 text-purple-600" />
                          Aparência
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Modo escuro</Label>
                            <p className="text-sm text-muted-foreground">
                              Usar tema escuro
                            </p>
                          </div>
                          <Switch
                            checked={settings.darkMode}
                            onCheckedChange={(checked) => handleSettingChange('darkMode', checked)}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="space-y-2">
                          <Label htmlFor="language">Idioma</Label>
                          <select
                            id="language"
                            value={settings.language}
                            onChange={(e) => handleSettingChange('language', e.target.value)}
                            className="w-full p-2 border border-border rounded-md bg-background"
                          >
                            <option value="pt-BR">Português (Brasil)</option>
                            <option value="en-US">English (US)</option>
                            <option value="es-ES">Español</option>
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Configurações de Privacidade */}
                    <Card className="border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                          <Shield className="h-5 w-5 text-red-600" />
                          Privacidade
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Perfil visível</Label>
                            <p className="text-sm text-muted-foreground">
                              Permitir que outros vejam seu perfil
                            </p>
                          </div>
                          <Switch
                            checked={settings.profileVisibility}
                            onCheckedChange={(checked) => handleSettingChange('profileVisibility', checked)}
                          />
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label>Compartilhamento de dados</Label>
                            <p className="text-sm text-muted-foreground">
                              Permitir análise de uso anônima
                            </p>
                          </div>
                          <Switch
                            checked={settings.dataSharing}
                            onCheckedChange={(checked) => handleSettingChange('dataSharing', checked)}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Botão de salvar */}
                  <div className="mt-8 flex justify-end">
                    <Button
                      onClick={handleSaveSettings}
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <IOSSpinner size="sm" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </div>
              </div>
            </PageTransition>
            <SupportButton variant="floating" />
          </AdaptiveLayout>
        </LayoutProvider>
      </BudgetErrorBoundary>
    </AuthErrorBoundary>
  );
};

export default SettingsPage;