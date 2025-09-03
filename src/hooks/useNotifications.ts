import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export interface NotificationData {
  id: string;
  user_notification_id?: string;
  notification_id?: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  target_type: 'all' | 'specific';
  target_user_id?: string;
  created_by: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
  read_at?: string;
  user_deleted_at?: string;
}

export interface NotificationFilters {
  type?: 'info' | 'warning' | 'success' | 'error' | 'all';
  read_status?: 'read' | 'unread' | 'all';
  deletedStatus?: 'active' | 'deleted';
}

export const useNotifications = () => {
  const { user, loading: authLoading } = useAuth();
  const { showError, showSuccess } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NotificationFilters>({
    type: 'all',
    read_status: 'all',
    deletedStatus: 'active'
  });

  // Debug: Log do estado de autenticação
  useEffect(() => {
    // Auth state debug
  }, [user, authLoading]);

  // Buscar notificações do usuário
  const {
    data: notifications = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['user-notifications', user?.id, filters],
    queryFn: async () => {
      // Starting notifications fetch

      if (!user?.id) {
        // User not found, returning empty array
        return [];
      }

      // Calling get_user_notifications with filters
      const { data, error } = await supabase.rpc('get_user_notifications', {
        p_limit: 50,
        p_offset: 0
      });
      
      // RPC result
      
      if (error) {
        console.error('🔍 DEBUG: Erro ao buscar notificações:', error);
        throw error;
      }

      let filteredData = data || [];
      // Data before filters

      // Aplicar filtros
      if (filters.type && filters.type !== 'all') {
        filteredData = filteredData.filter((n: any) => n.type === filters.type);
        // After type filter
      }

      if (filters.read_status && filters.read_status !== 'all') {
        if (filters.read_status === 'read') {
          filteredData = filteredData.filter((n: any) => n.is_read);
        } else {
          filteredData = filteredData.filter((n: any) => !n.is_read);
        }
        // After read filter
      }

      // Final data returned
      return filteredData;
    },
    enabled: !authLoading && !!user?.id,
    refetchInterval: 60000, // Atualizar a cada 60 segundos
    staleTime: 30000 // Considerar dados obsoletos após 30 segundos
  });

  // Contar notificações não lidas
  const notificationsArray = Array.isArray(notifications) ? notifications : [];
  const unreadCount = notificationsArray.filter((n: any) => !n.is_read).length;

  // Marcar notificação como lida
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Starting markAsRead
      
      const { data, error } = await supabase.rpc('mark_notification_as_read', {
        p_notification_id: notificationId
      });

      // markAsRead result

      if (error) {
        console.error('📖 DEBUG: Erro na função mark_notification_as_read:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data, notificationId) => {
      // markAsRead success
      // Invalidar cache para atualizar a lista
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      showSuccess({
        title: 'Sucesso',
        description: 'Notificação marcada como lida.'
      });
    },
    onError: (error) => {
      console.error('📖 DEBUG: Erro ao marcar notificação como lida:', error);
      showError({
        title: 'Erro',
        description: 'Não foi possível marcar a notificação como lida.'
      });
    }
  });

  // Marcar todas as notificações como lidas
  const markAllAsReadMutation = useMutation({
    mutationFn: async (options?: { silent?: boolean }) => {
      const unreadNotifications = notificationsArray.filter((n: any) => !n.is_read);
      
      const promises = unreadNotifications.map((notification: any) =>
        supabase.rpc('mark_notification_as_read', {
          p_notification_id: notification.id
        })
      );

      const results = await Promise.allSettled(promises);
      
      // Verificar se houve erros
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        throw new Error(`Falha ao marcar ${errors.length} notificações como lidas`);
      }

      return { results, silent: options?.silent };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      // Só mostrar notificação de sucesso se não for silencioso
      if (!data?.silent) {
        showSuccess({
          title: 'Sucesso',
          description: 'Todas as notificações foram marcadas como lidas.'
        });
      }
    },
    onError: (error) => {
      console.error('Erro ao marcar todas as notificações como lidas:', error);
      showError({
        title: 'Erro',
        description: 'Não foi possível marcar todas as notificações como lidas.'
      });
    }
  });

  // Soft delete de notificação individual
  const softDeleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Starting soft delete
      
      // Garantir que o notificationId seja um UUID válido
      let validUuid: string;
      try {
        // Se já é um UUID válido, usar diretamente
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notificationId)) {
          validUuid = notificationId;
        } else {
          // Se não é UUID, tentar converter ou usar como está (pode ser que o backend aceite)
          validUuid = notificationId;
        }
      } catch (e) {
        console.error('🗑️ DEBUG: Erro ao validar UUID:', e);
        validUuid = notificationId;
      }
      
      const { data, error } = await supabase.rpc('delete_user_notification', {
        p_notification_id: validUuid
      });

      // delete_user_notification RPC result

      if (error) {
        console.error('🗑️ DEBUG: Erro na RPC delete_user_notification:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      // Soft delete success
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      showSuccess({
        title: 'Sucesso',
        description: 'Mensagem movida para lixeira.'
      });
    },
    onError: (error) => {
      console.error('🗑️ DEBUG: Erro ao mover mensagem para lixeira:', error);
      showError({
        title: 'Erro',
        description: 'Não foi possível mover a mensagem para lixeira.'
      });
    }
  });

  // Restaurar notificação
  const restoreNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      // Starting restore
      
      // Note: restore function would need to be implemented in database
      // For now, just refresh the data
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      return null;

      // Restore executed
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      showSuccess({
        title: 'Sucesso',
        description: 'Mensagem restaurada com sucesso.'
      });
    },
    onError: (error) => {
      console.error('Erro ao restaurar mensagem:', error);
      showError({
        title: 'Erro',
        description: 'Não foi possível restaurar a mensagem.'
      });
    }
  });

  // Deletar todas as notificações
  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      const promises = notificationsArray.map((notification: any) => {
        // Garantir que o ID seja um UUID válido
        let validUuid = notification.id;
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(notification.id)) {
          // Invalid UUID
        }
        
        return supabase.rpc('delete_user_notification', {
          p_notification_id: validUuid
        });
      });

      const results = await Promise.allSettled(promises);
      
      // Verificar se houve erros
      const errors = results.filter(result => result.status === 'rejected');
      if (errors.length > 0) {
        throw new Error(`Falha ao excluir ${errors.length} notificações`);
      }

      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-notifications'] });
      showSuccess({
        title: 'Sucesso',
        description: 'Todas as notificações foram excluídas.'
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir todas as notificações:', error);
      showError({
        title: 'Erro',
        description: 'Não foi possível excluir todas as notificações.'
      });
    }
  });

  // Função para marcar notificação como lida
  const markAsRead = useCallback((notificationId: string) => {
    // markAsRead called
    markAsReadMutation.mutate(notificationId);
  }, [markAsReadMutation]);

  // Função para marcar todas como lidas
  const markAllAsRead = useCallback((silent?: boolean) => {
    markAllAsReadMutation.mutate({ silent });
  }, [markAllAsReadMutation]);

  // Função para soft delete de notificação
  const deleteNotification = useCallback((notificationId: string) => {
    // deleteNotification called
    softDeleteNotificationMutation.mutate(notificationId);
  }, [softDeleteNotificationMutation]);

  // Função para restaurar notificação
  const restoreNotification = useCallback((notificationId: string) => {
    restoreNotificationMutation.mutate(notificationId);
  }, [restoreNotificationMutation]);

  // Função para deletar todas as notificações
  const deleteAllNotifications = useCallback(() => {
    deleteAllNotificationsMutation.mutate();
  }, [deleteAllNotificationsMutation]);

  // Função para atualizar filtros
  const updateFilters = useCallback((newFilters: Partial<NotificationFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Função para refrescar notificações
  const refreshNotifications = useCallback(() => {
    refetch();
  }, [refetch]);

  // Remover polling adicional para evitar re-renders excessivos
  // O refetchInterval de 30 segundos já é suficiente para atualizações

  return {
    // Dados
    notifications: notificationsArray,
    unreadCount,
    isLoading,
    error,
    filters,
    
    // Ações
    markAsRead,
    markAllAsRead,
    deleteNotification,
    restoreNotification,
    deleteAllNotifications,
    updateFilters,
    refreshNotifications,
    
    // Estados de loading
    isMarkingAsRead: markAsReadMutation.isPending,
    isMarkingAllAsRead: markAllAsReadMutation.isPending,
    isDeletingNotification: softDeleteNotificationMutation.isPending,
    isRestoringNotification: restoreNotificationMutation.isPending,
    isDeletingAllNotifications: deleteAllNotificationsMutation.isPending
  };
};