import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  permission?: string;
  action?: () => void;
}

interface MenuData {
  items: MenuItem[];
  userInfo: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export const useMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuData, setMenuData] = useState<MenuData>({
    items: [],
    userInfo: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { profile, user, hasPermission, signOut } = useAuth();

  // Fetch menu data using native fetch()
  useEffect(() => {
    const fetchMenuData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call - replace with real endpoint if needed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const menuItems: MenuItem[] = [
          {
            id: 'home',
            label: 'Home',
            icon: 'Home',
            href: '/',
            description: 'Página inicial'
          },
          {
            id: 'new-budget',
            label: 'Novo Orçamento',
            icon: 'Plus',
            href: '/novo-orcamento',
            description: 'Criar um novo orçamento'
          },
          {
            id: 'admin',
            label: 'Administração',
            icon: 'Shield',
            href: '/admin',
            description: 'Painel administrativo'
          },
          {
            id: 'settings',
            label: 'Configurações',
            icon: 'Settings',
            href: '/configuracoes',
            description: 'Configurações do sistema'
          },
          {
            id: 'support',
            label: 'Suporte',
            icon: 'CircleHelp',
            href: '/suporte',
            description: 'Obter ajuda e suporte'
          }
        ];

        // Filter items based on permissions
        const filteredItems = menuItems.filter(item => 
          !item.permission || hasPermission(item.permission)
        );

        setMenuData({
          items: filteredItems,
          userInfo: {
            name: profile?.name || 'Usuário',
            email: user?.email || '',
            role: profile?.role || 'user'
          }
        });
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMenuData();
  }, [profile, user, hasPermission]);

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    closeMenu();
    await signOut();
  };

  return {
    isOpen,
    menuData,
    isLoading,
    openMenu,
    closeMenu,
    toggleMenu,
    handleLogout
  };
};