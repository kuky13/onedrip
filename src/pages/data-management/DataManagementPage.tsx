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
import { ArrowLeft, Database, Download, Upload, Trash2, RefreshCw, FileText, Users, Package } from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import SupportButton from '@/components/SupportButton';
import { cn } from '@/lib/utils';

export const DataManagementPage = () => {
  const navigate = useNavigate();
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  
  // Estado para controlar se está pronto para renderizar
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (user?.id && profile) {
      setIsReady(true);
    }
  }, [user?.id, profile]);
  
  const handleNavigateBack = () => {
    navigate('/dashboard');
  };
  
  const handleExportData = async (type: string) => {
    setIsLoading(true);
    try {
      // Simular exportação de dados
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Exportação concluída",
        description: `Dados de ${type} exportados com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleImportData = async (type: string) => {
    setIsLoading(true);
    try {
      // Simular importação de dados
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast({
        title: "Importação concluída",
        description: `Dados de ${type} importados com sucesso.`
      });
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: "Não foi possível importar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleClearData = async (type: string) => {
    if (!confirm(`Tem certeza que deseja limpar todos os dados de ${type}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Simular limpeza de dados
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({
        title: "Dados limpos",
        description: `Todos os dados de ${type} foram removidos.`
      });
    } catch (error) {
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível limpar os dados.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isReady) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            Carregando gestão de dados...
          </p>
        </div>
      </div>
    );
  }
  
  const dataCategories = [
    {
      id: 'budgets',
      title: 'Orçamentos',
      description: 'Gerencie todos os orçamentos criados',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      id: 'clients',
      title: 'Clientes',
      description: 'Dados de clientes e contatos',
      icon: Users,
      color: 'text-green-600'
    },
    {
      id: 'products',
      title: 'Produtos/Serviços',
      description: 'Catálogo de produtos e serviços',
      icon: Package,
      color: 'text-purple-600'
    }
  ];
  
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
                          Gestão de Dados
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
                        <Database className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">Gestão de Dados</h1>
                        <p className="text-muted-foreground">
                          Importe, exporte e gerencie seus dados
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Grid de categorias */}
                  <div className={cn(
                    "grid gap-6 mb-8",
                    isDesktop ? "grid-cols-3" : "grid-cols-1"
                  )}>
                    {dataCategories.map((category) => {
                      const IconComponent = category.icon;
                      return (
                        <Card key={category.id} className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <IconComponent className={`h-5 w-5 ${category.color}`} />
                              {category.title}
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                              {category.description}
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportData(category.title)}
                                disabled={isLoading}
                                className="flex flex-col items-center gap-1 h-auto py-3"
                              >
                                <Download className="h-4 w-4" />
                                <span className="text-xs">Exportar</span>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleImportData(category.title)}
                                disabled={isLoading}
                                className="flex flex-col items-center gap-1 h-auto py-3"
                              >
                                <Upload className="h-4 w-4" />
                                <span className="text-xs">Importar</span>
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleClearData(category.title)}
                                disabled={isLoading}
                                className="flex flex-col items-center gap-1 h-auto py-3 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="text-xs">Limpar</span>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  {/* Ações globais */}
                  <Card className="border-border/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <RefreshCw className="h-5 w-5 text-orange-600" />
                        Ações Globais
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Operações que afetam todos os dados
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Button
                          variant="outline"
                          onClick={() => handleExportData('todos os dados')}
                          disabled={isLoading}
                          className="flex items-center gap-2 justify-center"
                        >
                          <Download className="h-4 w-4" />
                          Exportar Tudo
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (confirm('Tem certeza que deseja limpar TODOS os dados? Esta ação não pode ser desfeita.')) {
                              handleClearData('todos os dados');
                            }
                          }}
                          disabled={isLoading}
                          className="flex items-center gap-2 justify-center text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          Limpar Tudo
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {isLoading && (
                    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
                      <div className="text-center space-y-4">
                        <IOSSpinner size="lg" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Processando operação...
                        </p>
                      </div>
                    </div>
                  )}
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

export default DataManagementPage;