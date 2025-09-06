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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  Database, 
  Activity, 
  Settings, 
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Server,
  HardDrive,
  Cpu
} from 'lucide-react';
import { useResponsive } from '@/hooks/useResponsive';
import { useToast } from '@/hooks/useToast';
import SupportButton from '@/components/SupportButton';
import { cn } from '@/lib/utils';

export const AdminPage = () => {
  const navigate = useNavigate();
  const { profile, user, hasPermission } = useAuth();
  const { isDesktop } = useResponsive();
  const { toast } = useToast();
  
  // Estado para controlar se está pronto para renderizar
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para dados administrativos
  const [adminData, setAdminData] = useState({
    users: {
      total: 0,
      active: 0,
      inactive: 0,
      newToday: 0
    },
    system: {
      uptime: '99.9%',
      cpuUsage: 45,
      memoryUsage: 62,
      diskUsage: 78,
      activeConnections: 156
    },
    budgets: {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    },
    performance: {
      avgResponseTime: '245ms',
      errorRate: '0.1%',
      throughput: '1.2k req/min'
    }
  });
  
  useEffect(() => {
    // Verificar se o usuário tem permissão de admin
    if (!hasPermission('admin')) {
      toast({
        title: "Acesso negado",
        description: "Você não tem permissão para acessar esta página.",
        variant: "destructive"
      });
      navigate('/dashboard');
      return;
    }
    
    if (user?.id && profile) {
      setIsReady(true);
      loadAdminData();
    }
  }, [user?.id, profile, hasPermission, navigate, toast]);
  
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Simular carregamento de dados administrativos
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setAdminData({
        users: {
          total: 1247,
          active: 892,
          inactive: 355,
          newToday: 23
        },
        system: {
          uptime: '99.9%',
          cpuUsage: 45,
          memoryUsage: 62,
          diskUsage: 78,
          activeConnections: 156
        },
        budgets: {
          total: 3456,
          pending: 89,
          approved: 2987,
          rejected: 380
        },
        performance: {
          avgResponseTime: '245ms',
          errorRate: '0.1%',
          throughput: '1.2k req/min'
        }
      });
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados administrativos.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigateBack = () => {
    navigate('/dashboard');
  };
  
  const getStatusColor = (value: number, type: 'usage' | 'performance') => {
    if (type === 'usage') {
      if (value < 50) return 'text-green-600';
      if (value < 80) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-blue-600';
  };
  
  const getStatusBadge = (value: number, type: 'usage' | 'performance') => {
    if (type === 'usage') {
      if (value < 50) return <Badge variant="outline" className="text-green-600 border-green-600">Ótimo</Badge>;
      if (value < 80) return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Atenção</Badge>;
      return <Badge variant="outline" className="text-red-600 border-red-600">Crítico</Badge>;
    }
    return <Badge variant="outline" className="text-blue-600 border-blue-600">Normal</Badge>;
  };
  
  if (!isReady) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <IOSSpinner size="lg" />
          <p className="text-sm text-muted-foreground font-medium">
            Verificando permissões...
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
                          Administração
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Conteúdo principal */}
                <div className="container mx-auto px-4 py-6">
                  <div className="mb-8">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <Shield className="h-6 w-6 text-red-600" />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold">Painel Administrativo</h1>
                        <p className="text-muted-foreground">
                          Monitore e gerencie o sistema
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center space-y-4">
                        <IOSSpinner size="lg" />
                        <p className="text-sm text-muted-foreground font-medium">
                          Carregando dados administrativos...
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Estatísticas gerais */}
                      <div className={cn(
                        "grid gap-4",
                        isDesktop ? "grid-cols-4" : "grid-cols-2"
                      )}>
                        <Card className="border-border/50">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Usuários Totais</p>
                                <p className="text-2xl font-bold">{adminData.users.total.toLocaleString()}</p>
                              </div>
                              <Users className="h-8 w-8 text-blue-600" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">+{adminData.users.newToday} hoje</span>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border/50">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Orçamentos</p>
                                <p className="text-2xl font-bold">{adminData.budgets.total.toLocaleString()}</p>
                              </div>
                              <BarChart3 className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-600" />
                              <span className="text-sm text-yellow-600 font-medium">{adminData.budgets.pending} pendentes</span>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border/50">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                                <p className="text-2xl font-bold">{adminData.system.uptime}</p>
                              </div>
                              <Activity className="h-8 w-8 text-green-600" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">Sistema estável</span>
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="border-border/50">
                          <CardContent className="p-6">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground">Conexões Ativas</p>
                                <p className="text-2xl font-bold">{adminData.system.activeConnections}</p>
                              </div>
                              <Server className="h-8 w-8 text-purple-600" />
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              <Activity className="h-4 w-4 text-blue-600" />
                              <span className="text-sm text-blue-600 font-medium">Em tempo real</span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className={cn(
                        "grid gap-6",
                        isDesktop ? "grid-cols-2" : "grid-cols-1"
                      )}>
                        {/* Status do Sistema */}
                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <Server className="h-5 w-5 text-blue-600" />
                              Status do Sistema
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Cpu className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">CPU</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-sm font-medium", getStatusColor(adminData.system.cpuUsage, 'usage'))}>
                                    {adminData.system.cpuUsage}%
                                  </span>
                                  {getStatusBadge(adminData.system.cpuUsage, 'usage')}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Memória</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-sm font-medium", getStatusColor(adminData.system.memoryUsage, 'usage'))}>
                                    {adminData.system.memoryUsage}%
                                  </span>
                                  {getStatusBadge(adminData.system.memoryUsage, 'usage')}
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">Disco</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn("text-sm font-medium", getStatusColor(adminData.system.diskUsage, 'usage'))}>
                                    {adminData.system.diskUsage}%
                                  </span>
                                  {getStatusBadge(adminData.system.diskUsage, 'usage')}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Usuários */}
                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-green-600" />
                              Usuários
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-2xl font-bold text-green-600">{adminData.users.active}</p>
                                <p className="text-sm text-muted-foreground">Ativos</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
                                <p className="text-2xl font-bold text-gray-600">{adminData.users.inactive}</p>
                                <p className="text-sm text-muted-foreground">Inativos</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Novos usuários hoje</span>
                              <Badge variant="outline" className="text-blue-600 border-blue-600">
                                +{adminData.users.newToday}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Performance */}
                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <Activity className="h-5 w-5 text-purple-600" />
                              Performance
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Tempo de resposta médio</span>
                                <span className="text-sm font-bold text-green-600">
                                  {adminData.performance.avgResponseTime}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Taxa de erro</span>
                                <span className="text-sm font-bold text-green-600">
                                  {adminData.performance.errorRate}
                                </span>
                              </div>
                              
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Throughput</span>
                                <span className="text-sm font-bold text-blue-600">
                                  {adminData.performance.throughput}
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Orçamentos */}
                        <Card className="border-border/50">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                              <BarChart3 className="h-5 w-5 text-orange-600" />
                              Orçamentos
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                              <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                <p className="text-lg font-bold text-yellow-600">{adminData.budgets.pending}</p>
                                <p className="text-xs text-muted-foreground">Pendentes</p>
                              </div>
                              <div className="text-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-lg font-bold text-green-600">{adminData.budgets.approved}</p>
                                <p className="text-xs text-muted-foreground">Aprovados</p>
                              </div>
                              <div className="text-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <p className="text-lg font-bold text-red-600">{adminData.budgets.rejected}</p>
                                <p className="text-xs text-muted-foreground">Rejeitados</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                      
                      {/* Ações administrativas */}
                      <Card className="border-border/50">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-3">
                            <Settings className="h-5 w-5 text-gray-600" />
                            Ações Administrativas
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={cn(
                            "grid gap-4",
                            isDesktop ? "grid-cols-4" : "grid-cols-2"
                          )}>
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-center gap-2"
                              onClick={() => navigate('/data-management')}
                            >
                              <Database className="h-6 w-6" />
                              <span className="text-sm font-medium">Gerenciar Dados</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-center gap-2"
                              onClick={() => navigate('/settings')}
                            >
                              <Settings className="h-6 w-6" />
                              <span className="text-sm font-medium">Configurações</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-center gap-2"
                              onClick={() => toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve." })}
                            >
                              <Users className="h-6 w-6" />
                              <span className="text-sm font-medium">Gerenciar Usuários</span>
                            </Button>
                            
                            <Button
                              variant="outline"
                              className="h-auto p-4 flex flex-col items-center gap-2"
                              onClick={() => toast({ title: "Em desenvolvimento", description: "Funcionalidade em breve." })}
                            >
                              <AlertTriangle className="h-6 w-6" />
                              <span className="text-sm font-medium">Logs do Sistema</span>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
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

export default AdminPage;