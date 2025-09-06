import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { Plus, Users, HelpCircle, Home, Settings, Database, FileText } from 'lucide-react';

interface AppSidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const AppSidebar = ({
  activeTab,
  onTabChange
}: AppSidebarProps) => {
  const {
    user,
    profile,
    hasRole
  } = useAuth();
  const {
    state
  } = useSidebar();
  const {
    isDesktop
  } = useResponsive();
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    { id: 'home', label: 'Home', icon: Home, permission: true, route: '/dashboard' },
    { id: 'budgets', label: 'Orçamentos', icon: FileText, permission: true, route: '/budgets' },
    { id: 'new-budget', label: 'Novo Orçamento', icon: Plus, permission: true, route: '/budgets/new' },
    { id: 'data-management', label: 'Gestão de Dados', icon: Database, permission: true, route: '/data-management' },
    { id: 'settings', label: 'Configurações', icon: Settings, permission: true, route: '/settings' },
    { id: 'help-center', label: 'Central de Ajuda', icon: HelpCircle, permission: true, route: '/central-de-ajuda' },
    { id: 'admin', label: 'Administração', icon: Users, permission: hasRole('admin'), route: '/admin' }
  ];

  const isCollapsed = state === "collapsed";

  return (
    <Sidebar 
      className={cn(
        "border-r border-border dark:border-white/5",
        "transition-all duration-200 ease-in-out",
        "h-screen flex flex-col",
        isDesktop && "desktop-sidebar w-[280px] data-[state=collapsed]:w-[60px] shadow-lg data-[state=collapsed]:shadow-md",
        "bg-card/50"
      )} 
      collapsible="icon"
    >
      {!isCollapsed && (
        <div className={cn(
          "transition-opacity duration-150 ease-out",
          !isCollapsed ? "opacity-100" : "opacity-0"
        )}>
          <SidebarHeader className={cn(
            "p-4 h-20 flex items-center border-b border-border/50",
            "transition-all duration-150 ease-out",
            isDesktop && "desktop-sidebar-header px-4 py-4 bg-card/30 min-h-[80px] flex items-center"
          )}>
            <div className={cn(
              "flex items-center gap-3 w-full",
              "transition-all duration-150 ease-out",
              isDesktop && "desktop-sidebar-user-info",
              isCollapsed && "justify-center"
            )}>
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-white font-semibold text-lg shrink-0",
                "bg-gradient-to-br from-primary to-primary/80 shadow-lg",
                "hover:shadow-xl transition-all duration-150 ease-out",
                isDesktop && "desktop-avatar w-10 h-10",
                isCollapsed && "w-8 h-8 text-sm"
              )}>
                {(profile?.name || user?.email || 'U').charAt(0).toUpperCase()}
              </div>
              
              <div className={cn(
                "flex flex-col min-w-0 flex-1 overflow-hidden",
                "transition-all duration-150 ease-out",
                isDesktop && "desktop-sidebar-user-text"
              )}>
                <p className={cn(
                  "text-sm font-semibold text-foreground truncate leading-tight",
                  "transition-all duration-150",
                  isDesktop && "desktop-sidebar-username text-sm font-600",
                  isCollapsed && "opacity-0 pointer-events-none"
                )}>
                  {profile?.name || 'Usuário'}
                </p>
                
                <p className={cn(
                  "text-xs text-muted-foreground truncate leading-tight mt-0.5",
                  "transition-all duration-150",
                  isDesktop && "desktop-sidebar-email text-xs opacity-80",
                  isCollapsed && "opacity-0 pointer-events-none"
                )}>
                  {user?.email}
                </p>
              </div>
            </div>
          </SidebarHeader>
        </div>
      )}
      
      {!isCollapsed && <SidebarSeparator />}
      
      <SidebarContent className={cn(
        "p-3 flex-1 overflow-y-auto",
        isDesktop && "px-4 pt-6 overflow-x-hidden desktop-sidebar-content"
      )}>
        <SidebarMenu className={cn(
          "flex flex-col gap-2",
          isDesktop && "desktop-sidebar-menu flex-col gap-2"
        )}>
          {navigationItems.map(item => {
            if (!item.permission) return null;
            const Icon = item.icon;
            
            return (
              <SidebarMenuItem 
                key={item.id} 
                className={cn(
                  "p-1",
                  isDesktop && "desktop-sidebar-item p-0 mb-1"
                )}
              >
                <SidebarMenuButton 
                  onClick={() => {
                    if (item.route) {
                      navigate(item.route);
                    } else if (onTabChange) {
                      onTabChange(item.id);
                    }
                  }} 
                  isActive={location.pathname === item.route || activeTab === item.id} 
                  className={cn(
                    "h-12 text-base font-medium rounded-lg transition-all duration-150 ease-out",
                    "hover:bg-accent/50 hover:text-accent-foreground",
                    "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground",
                    "data-[active=true]:shadow-md",
                    !isDesktop && "w-full",
                    isDesktop && "desktop-sidebar-button w-full px-3 py-2 justify-start gap-3 h-11 hover:shadow-md",
                    activeTab === item.id && "shadow-md"
                  )} 
                  tooltip={item.label}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-150",
                    isDesktop && "desktop-sidebar-icon h-4 w-4"
                  )} />
                  
                  <span className={cn(
                    "transition-all duration-150 font-medium",
                    isCollapsed && "opacity-0",
                    isDesktop && "desktop-sidebar-text text-sm font-500"
                  )}>
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};