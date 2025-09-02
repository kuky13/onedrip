import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  Key, 
  Image, 
  Gamepad2,
  BarChart3,
  Bell,
  Activity,
  Search,
  FileText,
  Lock,
  Settings
} from 'lucide-react';
import { UserManagement } from '@/components/UserManagement';
import { AdminLogs } from '@/components/AdminLogs';
import { SiteSettingsContent } from '@/components/SiteSettingsContent';
import { AdminImageManager } from '@/components/admin/AdminImageManager';
import { GameSettingsPanel } from '@/components/admin/GameSettingsPanel';
import { LicenseManagementPanel } from '@/components/admin/LicenseManagementPanel';
import { AdminNavigation } from '@/components/admin/AdminNavigation';
import { AdminQuickActions } from '@/components/admin/AdminQuickActions';
import { AdminNotificationManager } from '@/components/admin/AdminNotificationManager';
import WhatsAppAnalytics from '@/components/WhatsAppAnalytics';
import Security from '@/pages/Security';

type ActiveSection = 'overview' | 'users' | 'licenses' | 'site' | 'tools' | 'notifications' | 'settings' | 'whatsapp' | 'security';

export const AdminPanelModern = () => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('overview');
  const [searchTerm, setSearchTerm] = useState('');


  const toolsSubmenu = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3, component: null },
    { id: 'settings', label: 'Configurações', icon: Settings, component: null },
    { id: 'logs', label: 'Logs', icon: FileText, component: AdminLogs },
    { id: 'images', label: 'Imagens', icon: Image, component: AdminImageManager },
    { id: 'game', label: 'Jogo', icon: Gamepad2, component: GameSettingsPanel }
  ];

  const [activeToolsTab, setActiveToolsTab] = useState('analytics');

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-blue-500/20 rounded-xl">
                <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Total de Usuários</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">147</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-green-500/20 rounded-xl">
                <Activity className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-green-700 dark:text-green-300">Usuários Ativos</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">132</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 border-purple-200 dark:border-purple-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-purple-500/20 rounded-xl">
                <Key className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Licenças Válidas</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">128</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-orange-500/20 rounded-xl">
                <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-orange-700 dark:text-orange-300">Orçamentos</p>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">2,847</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações rápidas */}
      <AdminQuickActions onSectionChange={setActiveSection} />

      {/* Atividade recente */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Novo usuário registrado</p>
                  <p className="text-xs text-muted-foreground">João Silva - há 5 minutos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Licença expirando</p>
                  <p className="text-xs text-muted-foreground">Maria Santos - em 3 dias</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sistema atualizado</p>
                  <p className="text-xs text-muted-foreground">Versão 2.1.0 - há 2 horas</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Status do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Servidor</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  Online
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Base de Dados</span>
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  Conectada
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Backup</span>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  Atualizado
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Licenças</span>
                <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">
                  4 Expirando
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderTools = () => {
    const ActiveToolComponent = toolsSubmenu.find(tool => tool.id === activeToolsTab)?.component;
    
    return (
      <div className="space-y-6">
        {/* Submenu de ferramentas */}
        <Card>
          <CardHeader>
            <CardTitle>Ferramentas de Administração</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {toolsSubmenu.map((tool) => (
                <Button
                  key={tool.id}
                  variant={activeToolsTab === tool.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveToolsTab(tool.id)}
                  className="flex items-center gap-2"
                >
                  <tool.icon className="h-4 w-4" />
                  {tool.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo da ferramenta ativa */}
        <div className="animate-fade-in">
          {activeToolsTab === 'analytics' && (
            <Card>
              <CardHeader>
                <CardTitle>Analytics Avançados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em desenvolvimento - Analytics detalhados do sistema</p>
              </CardContent>
            </Card>
          )}
          {activeToolsTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle>Configurações Avançadas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em desenvolvimento - Configurações do sistema</p>
              </CardContent>
            </Card>
          )}
          {ActiveToolComponent && <ActiveToolComponent />}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'users':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerenciamento de Usuários
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <UserManagement />
            </CardContent>
          </Card>
        );
      case 'licenses':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Gerenciamento de Licenças
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LicenseManagementPanel />
            </CardContent>
          </Card>
        );
      case 'site':
        return <SiteSettingsContent />;
      case 'notifications':
        return (
          <Card>
            <CardContent className="p-6">
              <AdminNotificationManager />
            </CardContent>
          </Card>
        );
      case 'tools':
        return renderTools();
      case 'whatsapp':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Análises WhatsApp
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <WhatsAppAnalytics />
            </CardContent>
          </Card>
        );
      case 'security':
        return (
          <div className="space-y-6">
            <Security />
          </div>
        );
      default:
        return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-muted/40">
      <div className="container mx-auto p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        {/* Cabeçalho principal - Otimizado para móvel */}
        <div className="flex flex-col space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
                Painel Admin
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground">
                Central de controle do sistema
              </p>
            </div>
            
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full sm:w-48 lg:w-64 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <Badge variant="outline" className="flex items-center gap-1 px-2 py-1">
                <Lock className="h-3 w-3" />
                <span className="text-xs font-medium">Admin</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Navegação principal - Design móvel aprimorado */}
        <Card className="border shadow-sm">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <AdminNavigation 
              activeSection={activeSection} 
              onSectionChange={setActiveSection} 
            />
          </CardContent>
        </Card>

        {/* Conteúdo principal */}
        <div className="animate-fade-in">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};