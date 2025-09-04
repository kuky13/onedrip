import { useState, useEffect, useMemo } from 'react';
import { useUserManagement } from '@/hooks/useUserManagement';
import { toast } from 'sonner';

export interface AdminVariant {
  type: 'basic' | 'enhanced';
  features: {
    analytics?: boolean;
    bulkActions?: boolean;
    advancedFilters?: boolean;
    exportImport?: boolean;
    notifications?: boolean;
    systemInfo?: boolean;
    imageManager?: boolean;
    siteSettings?: boolean;
    logs?: boolean;
  };
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  expiredUsers: number;
  adminUsers?: number;
}

export interface AdminFilters {
  role: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AdminViewConfig {
  viewMode: 'table' | 'cards';
  showFilters: boolean;
  selectedUsers: string[];
}

export const useAdminData = (variant: AdminVariant) => {
  const {
    searchTerm,
    setSearchTerm,
    selectedUser,
    setSelectedUser,
    isEditModalOpen,
    setIsEditModalOpen,
    userToDelete,
    setUserToDelete,
    userToRenew,
    setUserToRenew,
    debugInfo,
    users,
    isLoading,
    error,
    deleteUserMutation,
    renewUserLicenseMutation,
    filteredUsers,
    handleEdit,
    handleDelete,
    handleRenew,
    confirmDelete,
    confirmRenewal
  } = useUserManagement();

  // Enhanced state (only for enhanced variant)
  const [filters, setFilters] = useState<AdminFilters>({
    role: 'all',
    status: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [viewConfig, setViewConfig] = useState<AdminViewConfig>({
    viewMode: 'cards',
    showFilters: false,
    selectedUsers: []
  });

  // Enhanced filtering and sorting (only for enhanced variant)
  const enhancedFilteredUsers = useMemo(() => {
    if (variant.type === 'basic') return filteredUsers;
    if (!users) return [];

    const filtered = users.filter((user: any) => {
      const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           user.email?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = filters.role === 'all' || user.role === filters.role;
      const matchesStatus = filters.status === 'all' ||
                           (filters.status === 'active' && user.license_active && new Date(user.expiration_date) > new Date()) ||
                           (filters.status === 'expired' && (!user.license_active || new Date(user.expiration_date) <= new Date()));
      return matchesSearch && matchesRole && matchesStatus;
    });

    // Sort users
    filtered.sort((a: any, b: any) => {
      let aValue = a[filters.sortBy];
      let bValue = b[filters.sortBy];
      
      if (filters.sortBy === 'expiration_date') {
        aValue = new Date(aValue || 0);
        bValue = new Date(bValue || 0);
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return filtered;
  }, [users, searchTerm, filters, variant.type, filteredUsers]);

  // Stats calculation
  const stats: AdminStats = useMemo(() => {
    if (!users) return {
      totalUsers: 0,
      activeUsers: 0,
      expiredUsers: 0,
      ...(variant.features.analytics && { adminUsers: 0 })
    };

    const baseStats = {
      totalUsers: users.length,
      activeUsers: users.filter((user: any) => 
        user.license_active && new Date(user.expiration_date) > new Date()
      ).length,
      expiredUsers: users.filter((user: any) => 
        !user.license_active || new Date(user.expiration_date) <= new Date()
      ).length
    };

    if (variant.features.analytics) {
      return {
        ...baseStats,
        adminUsers: users.filter((user: any) => user.role === 'admin').length
      };
    }

    return baseStats;
  }, [users, variant.features.analytics]);

  // Enhanced bulk actions (only for enhanced variant)
  const handleSelectAll = () => {
    if (variant.type === 'basic') return;
    
    const currentUsers = enhancedFilteredUsers;
    if (viewConfig.selectedUsers.length === currentUsers.length) {
      setViewConfig(prev => ({ ...prev, selectedUsers: [] }));
    } else {
      setViewConfig(prev => ({ 
        ...prev, 
        selectedUsers: currentUsers.map((user: any) => user.id) 
      }));
    }
  };

  const handleSelectUser = (userId: string) => {
    if (variant.type === 'basic') return;
    
    setViewConfig(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.includes(userId)
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId]
    }));
  };

  // Export functions (only for enhanced variant)
  const generateCSV = (userData: any[]) => {
    const headers = ['Nome', 'Email', 'Função', 'Status', 'Data de Expiração', 'Último Acesso', 'Orçamentos'];
    const rows = userData.map(user => [
      user.name || '',
      user.email || '',
      user.role === 'admin' ? 'Admin' : 'Usuário',
      getLicenseStatus(user),
      user.expiration_date ? formatDate(user.expiration_date) : '',
      user.last_sign_in_at ? formatDate(user.last_sign_in_at) : '',
      user.budget_count || 0
    ]);
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSelectedUsers = () => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    const selectedUserData = enhancedFilteredUsers.filter((user: any) => 
      viewConfig.selectedUsers.includes(user.id)
    );
    const csv = generateCSV(selectedUserData);
    downloadCSV(csv, 'usuarios_selecionados.csv');
  };

  const exportAllUsers = () => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    const csv = generateCSV(enhancedFilteredUsers);
    downloadCSV(csv, 'todos_usuarios.csv');
  };

  const handleExportUsers = () => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    const csv = generateCSV(enhancedFilteredUsers);
    downloadCSV(csv, `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    toast.success(`${enhancedFilteredUsers.length} usuários exportados com sucesso!`);
  };

  const handleImportUsers = (file: File) => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    console.log('Importing users from file:', file.name);
    toast.success('Funcionalidade de importação será implementada em breve');
  };

  const handleBackupData = () => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    const backupData = {
      users: enhancedFilteredUsers,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
    const dataStr = JSON.stringify(backupData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Backup dos dados realizado com sucesso!');
  };

  const handleCleanupInactiveUsers = () => {
    if (variant.type === 'basic' || !variant.features.exportImport) return;
    
    const inactiveUsers = enhancedFilteredUsers.filter((user: any) => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return !lastSignIn || lastSignIn < thirtyDaysAgo;
    });
    console.log(`Found ${inactiveUsers.length} inactive users for cleanup`);
    toast.success(`Identificados ${inactiveUsers.length} usuários inativos. Funcionalidade de limpeza será implementada em breve.`);
  };

  // Utility functions
  const getLicenseStatus = (user: any) => {
    if (!user.expiration_date) return 'Sem licença';
    const now = new Date();
    const expiresAt = new Date(user.expiration_date);
    if (expiresAt > now) {
      const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return `${daysLeft} dias restantes`;
    } else {
      return 'Expirada';
    }
  };

  const getStatusColor = (user: any) => {
    if (!user.expiration_date) return 'bg-gray-500/20 text-gray-900 dark:text-gray-200';
    const now = new Date();
    const expiresAt = new Date(user.expiration_date);
    if (expiresAt > now && user.license_active) {
      return 'bg-green-500/20 text-green-900 dark:text-green-200';
    } else {
      return 'bg-red-500/20 text-red-900 dark:text-red-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return {
    // Base user management
    searchTerm,
    setSearchTerm,
    selectedUser,
    setSelectedUser,
    isEditModalOpen,
    setIsEditModalOpen,
    userToDelete,
    setUserToDelete,
    userToRenew,
    setUserToRenew,
    debugInfo,
    users,
    isLoading,
    error,
    deleteUserMutation,
    renewUserLicenseMutation,
    handleEdit,
    handleDelete,
    handleRenew,
    confirmDelete,
    confirmRenewal,
    
    // Filtered users (basic or enhanced)
    filteredUsers: variant.type === 'enhanced' ? enhancedFilteredUsers : filteredUsers,
    
    // Stats
    stats,
    
    // Enhanced features (conditional)
    ...(variant.type === 'enhanced' && {
      filters,
      setFilters,
      viewConfig,
      setViewConfig,
      handleSelectAll,
      handleSelectUser,
      exportSelectedUsers,
      exportAllUsers,
      handleExportUsers,
      handleImportUsers,
      handleBackupData,
      handleCleanupInactiveUsers
    }),
    
    // Utility functions
    getLicenseStatus,
    getStatusColor,
    formatDate
  };
};