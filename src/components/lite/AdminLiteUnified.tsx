import React, { useEffect, memo, useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAdminData, AdminVariant } from '@/hooks/useAdminData';
import { useSecureUserProfile } from '@/hooks/useSecureUserProfile';
import { Users, Search, Filter, Download, Upload, Trash2, MoreVertical, Edit, RefreshCw, Eye, Grid, List, Crown, Shield, FileText, EyeOff, SortAsc, SortDesc } from 'lucide-react';
import { UserEditModal } from '@/components/modals/UserEditModal';
import { UserDeleteModal } from '@/components/modals/UserDeleteModal';
import { LicenseRenewalModal } from '@/components/modals/LicenseRenewalModal';
import { useStableCallback, useShallowMemo, usePerformanceMonitor } from '@/hooks/usePerformanceOptimization';

interface AdminLiteUnifiedProps {
  variant: 'basic' | 'enhanced';
}

const AdminLiteUnified: React.FC<AdminLiteUnifiedProps> = memo(({ variant = 'basic' }) => {
  const { profile, loading: profileLoading } = useSecureUserProfile();
  const { measurePerformance } = usePerformanceMonitor('AdminLiteUnified');
  
  // Create AdminVariant object based on variant prop with memoization
  const adminVariant: AdminVariant = useMemo(() => ({
    type: variant,
    features: {
      analytics: variant === 'enhanced',
      bulkActions: variant === 'enhanced',
      advancedFilters: variant === 'enhanced',
      exportImport: variant === 'enhanced',
      notifications: variant === 'enhanced',
      systemInfo: variant === 'enhanced',
      imageManager: variant === 'enhanced',
      siteSettings: variant === 'enhanced',
      logs: variant === 'enhanced'
    }
  }), [variant]);
  
  const {
    users,
    filteredUsers,
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
    isLoading,
    error,
    deleteUserMutation,
    renewUserLicenseMutation,
    handleEdit,
    handleDelete,
    handleRenew,
    confirmDelete,
    confirmRenewal,
    stats,
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
    handleCleanupInactiveUsers,
    getLicenseStatus,
    getStatusColor,
    formatDate
  } = useAdminData(adminVariant);
   
  const [activeTab, setActiveTab] = useState('users');
  const [sortConfig, setSortConfig] = useState({ field: 'name', direction: 'asc' as 'asc' | 'desc' });
  
  // Enhanced features state (only for enhanced variant) - memoized
  const enhancedState = useMemo(() => ({
    selectedUsers: adminVariant.type === 'enhanced' ? viewConfig?.selectedUsers || [] : [],
    viewMode: adminVariant.type === 'enhanced' ? viewConfig?.viewMode || 'card' : 'card',
    showInactive: adminVariant.type === 'enhanced' ? viewConfig?.showInactive || false : false
  }), [adminVariant.type, viewConfig]);
  
  const { selectedUsers, viewMode, showInactive } = enhancedState;
  
  // Stable callbacks for state setters
  const setSelectedUsers = useStableCallback((users: string[]) => {
    if (adminVariant.type === 'enhanced' && setViewConfig) {
      setViewConfig(prev => ({ ...prev, selectedUsers: users }));
    }
  }, [adminVariant.type, setViewConfig]);
  
  const setViewMode = useStableCallback((mode: 'card' | 'table') => {
    if (adminVariant.type === 'enhanced' && setViewConfig) {
      setViewConfig(prev => ({ ...prev, viewMode: mode }));
    }
  }, [adminVariant.type, setViewConfig]);
  
  const setShowInactive = useStableCallback((show: boolean) => {
    if (adminVariant.type === 'enhanced' && setViewConfig) {
      setViewConfig(prev => ({ ...prev, showInactive: show }));
    }
  }, [adminVariant.type, setViewConfig]);
  
  const refreshUsers = useStableCallback(() => {
    measurePerformance('refreshUsers', () => {
      // Refresh functionality - could trigger a refetch
      console.log('Refreshing users...');
    });
  }, [measurePerformance]);

  // Enhanced action handlers - memoized
  const handleBulkExport = useStableCallback(() => {
    if (adminVariant.type === 'enhanced' && exportSelectedUsers) {
      measurePerformance('bulkExport', () => {
        exportSelectedUsers();
      });
    }
  }, [adminVariant.type, exportSelectedUsers, measurePerformance]);

  const handleUserImport = useStableCallback(() => {
    if (adminVariant.type === 'enhanced' && handleImportUsers) {
      measurePerformance('userImport', () => {
        handleImportUsers();
      });
    }
  }, [adminVariant.type, handleImportUsers, measurePerformance]);

  const handleDataBackup = useStableCallback(() => {
    if (adminVariant.type === 'enhanced' && handleBackupData) {
      measurePerformance('dataBackup', () => {
        handleBackupData();
      });
    }
  }, [adminVariant.type, handleBackupData, measurePerformance]);

  const handleCleanupInactive = useStableCallback(() => {
    if (adminVariant.type === 'enhanced' && handleCleanupInactiveUsers) {
      measurePerformance('cleanupInactive', () => {
        handleCleanupInactiveUsers();
      });
    }
  }, [adminVariant.type, handleCleanupInactiveUsers, measurePerformance]);

  useEffect(() => {
    if (profile) {
      console.log('Admin profile loaded:', profile);
    }
  }, [profile]);

  const handleSelectUserLocal = useStableCallback((userId: string, checked: boolean) => {
    if (adminVariant.type === 'enhanced' && handleSelectUser) {
      handleSelectUser(userId, checked);
    }
  }, [adminVariant.type, handleSelectUser]);

  const handleSelectAllLocal = useStableCallback((checked: boolean) => {
    if (adminVariant.type === 'enhanced' && handleSelectAll) {
      handleSelectAll(checked);
    }
  }, [adminVariant.type, handleSelectAll]);

  const renderUserStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Total Users</p>
              <p className="text-2xl font-bold">{stats?.totalUsers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">VIP Users</p>
              <p className="text-2xl font-bold">{stats?.vipUsers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-500" />
            <div>
              <p className="text-sm font-medium">Active Users</p>
              <p className="text-2xl font-bold">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <FileText className="h-4 w-4 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Total Budgets</p>
              <p className="text-2xl font-bold">{stats?.totalBudgets || 0}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderSearchAndFilters = () => (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        {adminVariant.type === 'enhanced' && (
          <>
            <Button
              variant="outline"
              onClick={() => setShowInactive(!showInactive)}
              className="flex items-center gap-2"
            >
              {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showInactive ? 'Hide Inactive' : 'Show Inactive'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
              className="flex items-center gap-2"
            >
              {viewMode === 'card' ? <List className="h-4 w-4" /> : <Grid className="h-4 w-4" />}
              {viewMode === 'card' ? 'Table View' : 'Card View'}
            </Button>
            <Button
              variant="outline"
              onClick={refreshUsers}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        )}
      </div>
      
      {adminVariant.type === 'enhanced' && (
        <div className="flex flex-wrap gap-4">
          <Select value={filters.role} onValueChange={(value) => setFilters({...filters, role: value})}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortConfig.field} onValueChange={(value) => setSortConfig({...sortConfig, field: value})}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="created_at">Created Date</SelectItem>
              <SelectItem value="last_login">Last Login</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => setSortConfig({...sortConfig, direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}
            className="flex items-center gap-2"
          >
            {sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            {sortConfig.direction === 'asc' ? 'Ascending' : 'Descending'}
          </Button>
        </div>
      )}
    </div>
  );

  const renderBulkActions = () => {
    if (adminVariant.type !== 'enhanced' || selectedUsers.length === 0) return null;
    
    return (
      <div className="flex items-center gap-4 mb-4 p-4 bg-blue-50 rounded-lg">
        <span className="text-sm font-medium">{selectedUsers.length} users selected</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkExport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Export Selected
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectedUsers([])}
        >
          Clear Selection
        </Button>
      </div>
    );
  };

  const renderUserList = () => {
    if (isLoading) {
      return <div className="text-center py-8">Loading users...</div>;
    }

    if (error) {
      return <div className="text-center py-8 text-red-500">Error: {error}</div>;
    }

    if (filteredUsers.length === 0) {
      return <div className="text-center py-8">No users found.</div>;
    }

    if (adminVariant.type === 'enhanced' && viewMode === 'table') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-4">
                  <Checkbox
                    checked={selectedUsers.length === filteredUsers.length}
                    onCheckedChange={handleSelectAllLocal}
                  />
                </th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Email</th>
                <th className="text-left p-4">Role</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Budgets</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">
                    <Checkbox
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) => handleSelectUserLocal(user.id, checked as boolean)}
                    />
                  </td>
                  <td className="p-4 font-medium">{user.name}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'vip' ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                      {user.status}
                    </Badge>
                  </td>
                  <td className="p-4">{user.budget_count || 0}</td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRenewal(user)}>
                          Renew License
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(user)} className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              {adminVariant.type === 'enhanced' && (
                <div className="flex items-center justify-between mb-2">
                  <Checkbox
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUserLocal(user.id, checked as boolean)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleEdit(user)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRenewal(user)}>
                        Renew License
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(user)} className="text-red-600">
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="font-semibold">{user.name}</h3>
                <p className="text-sm text-gray-600">{user.email}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'vip' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                  <Badge variant={user.status === 'active' ? 'default' : 'destructive'}>
                    {user.status}
                  </Badge>
                </div>
                {adminVariant.type === 'enhanced' && (
                  <p className="text-sm text-gray-500">Budgets: {user.budget_count || 0}</p>
                )}
                {adminVariant.type === 'basic' && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleRenewal(user)}>
                      Renew
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(user)}>
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderEnhancedActions = () => {
    if (adminVariant.type !== 'enhanced') return null;
    
    return (
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          variant="outline"
          onClick={handleUserImport}
          className="flex items-center gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Users
        </Button>
        <Button
          variant="outline"
          onClick={handleDataBackup}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Backup Data
        </Button>
        <Button
          variant="outline"
          onClick={handleCleanupInactive}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Cleanup Inactive
        </Button>
      </div>
    );
  };

  const renderEnhancedTabs = () => {
    if (adminVariant.type !== 'enhanced') return null;
    
    const enhancedTabs = [
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'licenses', label: 'Licenses', icon: Shield },
      { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'vip', label: 'VIP', icon: Crown },
      { id: 'game', label: 'Game', icon: Gamepad2 },
      { id: 'logs', label: 'Logs', icon: FileSearch },
      { id: 'debug', label: 'Debug', icon: Bug },
      { id: 'tests', label: 'Tests', icon: TestTube },
      { id: 'images', label: 'Images', icon: Image },
      { id: 'site', label: 'Site', icon: Globe },
      { id: 'system', label: 'System', icon: Server }
    ];
    
    return enhancedTabs.map(tab => (
      <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-2">
        <tab.icon className="h-4 w-4" />
        {tab.label}
      </TabsTrigger>
    ));
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div>
            {renderUserStats()}
            {renderSearchAndFilters()}
            {renderEnhancedActions()}
            {renderBulkActions()}
            {renderUserList()}
          </div>
        );
      case 'licenses':
        return <div className="p-8 text-center">License management coming soon...</div>;
      case 'vip':
        return <div className="p-8 text-center">VIP management coming soon...</div>;
      case 'game':
        return <div className="p-8 text-center">Game settings coming soon...</div>;
      case 'analytics':
        return <div className="p-8 text-center">Analytics dashboard coming soon...</div>;
      case 'settings':
        return <div className="p-8 text-center">System settings coming soon...</div>;
      case 'notifications':
        return <div className="p-8 text-center">Notification management coming soon...</div>;
      case 'logs':
        return <div className="p-8 text-center">System logs coming soon...</div>;
      case 'debug':
        return <div className="p-8 text-center">Debug tools coming soon...</div>;
      case 'tests':
        return <div className="p-8 text-center">Test suite coming soon...</div>;
      case 'images':
        return <div className="p-8 text-center">Image management coming soon...</div>;
      case 'site':
        return <div className="p-8 text-center">Site configuration coming soon...</div>;
      case 'system':
        return <div className="p-8 text-center">System information coming soon...</div>;
      default:
        return <div className="p-8 text-center">Tab content not found.</div>;
    }
  };

  if (profileLoading || isLoading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Admin Panel {adminVariant.type === 'enhanced' && '(Enhanced)'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
              <TabsTrigger value="licenses" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Licenses
              </TabsTrigger>
              <TabsTrigger value="vip" className="flex items-center gap-2">
                <Crown className="h-4 w-4" />
                VIP
              </TabsTrigger>
              <TabsTrigger value="game" className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Game
              </TabsTrigger>
              {renderEnhancedTabs()}
            </TabsList>
            
            <TabsContent value={activeTab} className="mt-6">
              {renderTabContent()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Name"
              value={selectedUser?.name || ''}
              onChange={(e) => setSelectedUser({...selectedUser, name: e.target.value})}
            />
            <Input
              placeholder="Email"
              value={selectedUser?.email || ''}
              onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
            />
            <div className="flex gap-2">
              <Button onClick={() => handleEdit(selectedUser)}>Save Changes</Button>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.</p>
          <div className="flex gap-2 mt-4">
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            <Button variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renewal Dialog */}
      <Dialog open={!!userToRenew} onOpenChange={() => setUserToRenew(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renew License</DialogTitle>
          </DialogHeader>
          <p>Renew license for {userToRenew?.name}?</p>
          <div className="flex gap-2 mt-4">
            <Button onClick={confirmRenewal}>Renew</Button>
            <Button variant="outline" onClick={() => setUserToRenew(null)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
});

export default AdminLiteUnified;
export type { AdminLiteUnifiedProps };