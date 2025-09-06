
import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export interface ShopProfile {
  id: string;
  user_id: string;
  shop_name: string;
  address: string;
  contact_phone: string;
  cnpj?: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

export const useShopProfile = () => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const queryClient = useQueryClient();

  const [testShopProfile, setTestShopProfile] = useState<ShopProfile | null>(null);

  const { data: shopProfile, isLoading, error } = useQuery({
    queryKey: ['shop-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Fetching shop profile
      const { data, error } = await supabase
        .from('shop_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching shop profile:', error);
        throw error;
      }
      
      // Shop profile loaded
      return data as ShopProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Para teste: se não conseguir carregar do Supabase, usar dados de teste
  useEffect(() => {
    if (!isLoading && !shopProfile && error && user?.id) {
      console.log('[useShopProfile] Usando dados de teste devido ao erro:', error);
      const testData: ShopProfile = {
        id: 'test-shop-001',
        user_id: user.id,
        shop_name: 'TechRepair Pro',
        address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
        contact_phone: '(11) 98765-4321',
        cnpj: '12.345.678/0001-90',
        logo_url: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      setTestShopProfile(testData);
    } else if (shopProfile) {
      setTestShopProfile(null);
    }
  }, [isLoading, shopProfile, error, user?.id]);

  const createOrUpdateMutation = useMutation({
    mutationFn: async (profileData: Partial<ShopProfile>) => {
      if (!user?.id) throw new Error('User not authenticated');

      const payload = {
        user_id: user.id,
        shop_name: profileData.shop_name || '',
        address: profileData.address || '',
        contact_phone: profileData.contact_phone || '',
        cnpj: profileData.cnpj || null,
        logo_url: profileData.logo_url || null,
      };

      // Saving shop profile

      if (shopProfile?.id) {
        // Update existing profile
        const { data, error } = await supabase
          .from('shop_profiles')
          .update(payload)
          .eq('id', shopProfile.id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('shop_profiles')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-profile', user?.id] });
      showSuccess({
        title: 'Perfil da empresa salvo',
        description: 'As informações da empresa foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error saving shop profile:', error);
      showError({
        title: 'Erro ao salvar',
        description: 'Ocorreu um erro ao salvar as informações da empresa.',
      });
    },
  });

  const uploadLogoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('User not authenticated');

      // Starting logo upload

      // Verificar tamanho do arquivo (3MB = 3145728 bytes)
      if (file.size > 3145728) {
        throw new Error('O arquivo deve ter no máximo 3MB');
      }

      // Verificar tipo do arquivo com validação mais rigorosa
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Tipo de arquivo "${file.type}" não é aceito. Este sistema não aceita esse tipo de arquivo. Use apenas PNG, JPEG, WebP ou GIF.`);
      }

      // Verificar se o arquivo não está corrompido
      if (file.size === 0) {
        throw new Error('O arquivo parece estar corrompido ou vazio');
      }

      // Remover logo anterior se existir
      if (shopProfile?.logo_url) {
        try {
          const urlParts = shopProfile.logo_url.split('/');
          const oldFileName = `${user.id}/${urlParts[urlParts.length - 1]}`;
          // Removing old logo
          
          await supabase.storage
            .from('company-logos')
            .remove([oldFileName]);
        } catch (error) {
          console.warn('Error removing old logo:', error);
        }
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/logo.${fileExt}`;
      // Uploading file

      // Upload do arquivo
      const { data, error } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, {
          upsert: true,
          contentType: file.type
        });

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      // Upload successful

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Public URL generated
      return publicUrl;
    },
    onSuccess: async (logoUrl) => {
      // Logo uploaded, updating profile
      
      try {
        // Atualizar o perfil com a nova URL da logo
        const currentProfile = shopProfile || {};
        await createOrUpdateMutation.mutateAsync({ 
          ...currentProfile,
          logo_url: logoUrl 
        });
        
        showSuccess({
          title: 'Logo enviada com sucesso',
          description: 'A logo da empresa foi atualizada.',
        });
      } catch (error) {
        console.error('Error updating profile after logo upload:', error);
        showError({
          title: 'Erro ao atualizar perfil',
          description: 'Logo enviada, mas houve erro ao atualizar o perfil.',
        });
      }
    },
    onError: (error) => {
      console.error('Error uploading logo:', error);
      showError({
        title: 'Erro ao enviar logo',
        description: error.message || 'Ocorreu um erro ao enviar a logo.',
      });
    },
  });

  const removeLogoMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !shopProfile?.logo_url) throw new Error('No logo to remove');

      // Removing logo

      try {
        // Extrair o caminho do arquivo da URL
        const urlParts = shopProfile.logo_url.split('/');
        const fileName = `${user.id}/${urlParts[urlParts.length - 1]}`;
        // Removing file

        // Remover do storage
        const { error } = await supabase.storage
          .from('company-logos')
          .remove([fileName]);

        if (error) {
          console.error('Error removing from storage:', error);
          // Não falhar se não conseguir remover do storage
          // Continuing despite storage error
        }

        // Atualizar o perfil removendo a URL da logo
        await createOrUpdateMutation.mutateAsync({ 
          ...shopProfile,
          logo_url: null 
        });
      } catch (error) {
        console.error('Error in remove logo process:', error);
        throw error;
      }
    },
    onSuccess: () => {
      showSuccess({
        title: 'Logo removida',
        description: 'A logo da empresa foi removida com sucesso.',
      });
    },
    onError: (error) => {
      console.error('Error removing logo:', error);
      showError({
        title: 'Erro ao remover logo',
        description: 'Ocorreu um erro ao remover a logo.',
      });
    },
  });

  return {
    shopProfile: shopProfile || testShopProfile,
    isLoading,
    saveProfile: createOrUpdateMutation.mutate,
    isSaving: createOrUpdateMutation.isPending,
    uploadLogo: uploadLogoMutation.mutate,
    isUploadingLogo: uploadLogoMutation.isPending,
    removeLogo: removeLogoMutation.mutate,
    isRemovingLogo: removeLogoMutation.isPending,
  };
};
