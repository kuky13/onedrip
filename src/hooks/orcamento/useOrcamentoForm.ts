import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';

interface FormData {
  device_type: string;
  device_model: string;
  issue: string;
  part_type: string;
  part_quality: string;
  warranty_months: number;
  client_name: string;
  client_phone: string;
  client_email: string;
  cash_price: number;
  installment_price: number;
  installments: number;
  payment_condition: string;
  valid_days: number;
  includes_delivery: boolean;
  includes_screen_protector: boolean;
  notes: string;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

interface UseOrcamentoFormReturn {
  formData: FormData;
  setFormData: React.Dispatch<React.SetStateAction<FormData>>;
  isSubmitting: boolean;
  deviceTypes: string[];
  warrantyPeriods: number[];
  existingClients: Client[];
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  handleSubmit: () => Promise<void>;
  loadBudgetForEdit: (budgetId: string) => Promise<void>;
  resetForm: () => void;
}

const initialFormData: FormData = {
  device_type: '',
  device_model: '',
  issue: '',
  part_type: '',
  part_quality: 'original',
  warranty_months: 3,
  client_name: '',
  client_phone: '',
  client_email: '',
  cash_price: 0,
  installment_price: 0,
  installments: 1,
  payment_condition: 'à vista',
  valid_days: 15,
  includes_delivery: false,
  includes_screen_protector: false,
  notes: ''
};

export const useOrcamentoForm = (budgetId?: string): UseOrcamentoFormReturn => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deviceTypes] = useState<string[]>([
    'iPhone', 'Samsung Galaxy', 'Motorola', 'Xiaomi', 'LG', 'Huawei', 'Outro'
  ]);
  const [warrantyPeriods] = useState<number[]>([1, 3, 6, 12]);
  const [existingClients, setExistingClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Carregar clientes existentes
  const loadExistingClients = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('client_name, client_phone, client_email')
        .eq('owner_id', user.id)
        .not('client_name', 'is', null)
        .not('client_phone', 'is', null);

      if (error) throw error;

      // Remover duplicatas e criar lista de clientes únicos
      const uniqueClients = data
        .filter((item, index, self) => 
          index === self.findIndex(t => t.client_phone === item.client_phone)
        )
        .map((item, index) => ({
          id: `client_${index}`,
          name: item.client_name || '',
          phone: item.client_phone || '',
          email: item.client_email || ''
        }))
        .filter(client => client.name && client.phone);

      setExistingClients(uniqueClients);
    } catch (err) {
      console.error('Error loading existing clients:', err);
    }
  }, [user?.id]);

  // Carregar orçamento para edição
  const loadBudgetForEdit = useCallback(async (budgetId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('id', budgetId)
        .eq('owner_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          device_type: data.device_type || '',
          device_model: data.device_model || '',
          issue: data.issue || '',
          part_type: data.part_type || '',
          part_quality: data.part_quality || 'original',
          warranty_months: data.warranty_months || 3,
          client_name: data.client_name || '',
          client_phone: data.client_phone || '',
          client_email: data.client_email || '',
          cash_price: data.cash_price || 0,
          installment_price: data.installment_price || 0,
          installments: data.installments || 1,
          payment_condition: data.payment_condition || 'à vista',
          valid_days: 15, // Calculado baseado em valid_until
          includes_delivery: data.includes_delivery || false,
          includes_screen_protector: data.includes_screen_protector || false,
          notes: data.notes || ''
        });
      }
    } catch (err: any) {
      console.error('Error loading budget for edit:', err);
      showError({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar o orçamento para edição.'
      });
    }
  }, [user?.id, showError]);

  // Submeter formulário
  const handleSubmit = useCallback(async () => {
    if (!user?.id) return;

    // Validação básica
    if (!formData.device_type || !formData.device_model || !formData.client_name || !formData.client_phone) {
      showError({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios.'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + formData.valid_days);

      const budgetData = {
        device_type: formData.device_type,
        device_model: formData.device_model,
        issue: formData.issue,
        part_type: formData.part_type,
        part_quality: formData.part_quality,
        warranty_months: formData.warranty_months,
        client_name: formData.client_name,
        client_phone: formData.client_phone,
        client_email: formData.client_email,
        cash_price: formData.cash_price,
        installment_price: formData.installment_price,
        installments: formData.installments,
        total_price: formData.payment_condition === 'à vista' ? formData.cash_price : formData.installment_price,
        payment_condition: formData.payment_condition,
        valid_until: validUntil.toISOString(),
        includes_delivery: formData.includes_delivery,
        includes_screen_protector: formData.includes_screen_protector,
        notes: formData.notes,
        status: 'pending',
        workflow_status: 'budget_sent',
        owner_id: user.id
      };

      let result;
      if (budgetId) {
        // Atualizar orçamento existente
        result = await supabase
          .from('budgets')
          .update(budgetData)
          .eq('id', budgetId)
          .eq('owner_id', user.id)
          .select()
          .single();
      } else {
        // Criar novo orçamento
        result = await supabase
          .from('budgets')
          .insert(budgetData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Criar/atualizar budget_parts se necessário
      if (formData.part_type && result.data) {
        const partData = {
          budget_id: result.data.id,
          part_name: formData.part_type,
          part_quality: formData.part_quality,
          price: formData.payment_condition === 'à vista' ? formData.cash_price : formData.installment_price,
          warranty_months: formData.warranty_months
        };

        if (budgetId) {
          // Atualizar parte existente ou criar nova
          const { error: partError } = await supabase
            .from('budget_parts')
            .upsert(partData, { onConflict: 'budget_id,part_name' });
          
          if (partError) console.error('Error updating budget part:', partError);
        } else {
          // Criar nova parte
          const { error: partError } = await supabase
            .from('budget_parts')
            .insert(partData);
          
          if (partError) console.error('Error creating budget part:', partError);
        }
      }

      showSuccess({
        title: budgetId ? 'Orçamento atualizado' : 'Orçamento criado',
        description: budgetId ? 'O orçamento foi atualizado com sucesso.' : 'O orçamento foi criado com sucesso.'
      });

      // Navegar de volta para a lista
      navigate('/orcamento');
    } catch (err: any) {
      console.error('Error submitting budget:', err);
      showError({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar o orçamento. Tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, user?.id, budgetId, showSuccess, showError, navigate]);

  // Resetar formulário
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setSelectedClient(null);
  }, []);

  // Atualizar dados do cliente quando selecionado
  useEffect(() => {
    if (selectedClient) {
      setFormData(prev => ({
        ...prev,
        client_name: selectedClient.name,
        client_phone: selectedClient.phone,
        client_email: selectedClient.email || ''
      }));
    }
  }, [selectedClient]);

  // Carregar dados iniciais
  useEffect(() => {
    loadExistingClients();
    
    if (budgetId) {
      loadBudgetForEdit(budgetId);
    }
  }, [loadExistingClients, loadBudgetForEdit, budgetId]);

  return {
    formData,
    setFormData,
    isSubmitting,
    deviceTypes,
    warrantyPeriods,
    existingClients,
    selectedClient,
    setSelectedClient,
    handleSubmit,
    loadBudgetForEdit,
    resetForm
  };
};