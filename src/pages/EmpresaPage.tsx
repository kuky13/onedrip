import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Upload, 
  Save, 
  Trash2, 
  AlertCircle,
  Image as ImageIcon,
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useShopProfile } from '@/hooks/useShopProfile';
import { useCompanyDataLoader } from '@/hooks/useCompanyDataLoader';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmpresaFormData {
  shop_name: string;
  address: string;
  contact_phone: string;
  cnpj: string;
  logo_url: string;
}

const initialEmpresaData: EmpresaFormData = {
  shop_name: '',
  address: '',
  contact_phone: '',
  cnpj: '',
  logo_url: ''
};

export function EmpresaPage() {
  const navigate = useNavigate();
  const {
    shopProfile,
    isLoading,
    createOrUpdateMutation,
    uploadLogoMutation,
    removeLogoMutation
  } = useShopProfile();
  
  // Hook para sincronizar cache do PDF após salvar dados
  const { refreshData } = useCompanyDataLoader();

  const [empresaData, setEmpresaData] = useState<EmpresaFormData>(initialEmpresaData);
  const [empresaErrors, setEmpresaErrors] = useState<Partial<EmpresaFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shopProfile) {
      setEmpresaData({
        shop_name: shopProfile.shop_name || '',
        address: shopProfile.address || '',
        contact_phone: shopProfile.contact_phone || '',
        cnpj: shopProfile.cnpj || '',
        logo_url: shopProfile.logo_url || ''
      });
    }
  }, [shopProfile]);

  const validateEmpresaForm = (): boolean => {
    const errors: Partial<EmpresaFormData> = {};

    if (!empresaData.shop_name.trim()) {
      errors.shop_name = 'Nome da empresa é obrigatório';
    }

    if (!empresaData.address.trim()) {
      errors.address = 'Endereço é obrigatório';
    }

    if (!empresaData.contact_phone.trim()) {
      errors.contact_phone = 'Telefone de contato é obrigatório';
    } else if (!empresaData.contact_phone.match(/^\(?\d{2}\)?[\s-]?\d{4,5}[\s-]?\d{4}$/)) {
      errors.contact_phone = 'Formato de telefone inválido';
    }

    if (empresaData.cnpj && !empresaData.cnpj.match(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/)) {
      errors.cnpj = 'Formato de CNPJ inválido';
    }

    setEmpresaErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const formatPhone = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const formatCNPJ = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const handleInputChange = (field: keyof EmpresaFormData, value: string) => {
    let formattedValue = value;
    
    if (field === 'contact_phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'cnpj') {
      formattedValue = formatCNPJ(value);
    }

    setEmpresaData({ ...empresaData, [field]: formattedValue });
    
    // Clear error when user starts typing
    if (empresaErrors[field]) {
      setEmpresaErrors({ ...empresaErrors, [field]: undefined });
    }
  };

  const handleEmpresaSubmit = async () => {
    if (!validateEmpresaForm()) {
      return;
    }

    setIsSaving(true);
    try {
      await createOrUpdateMutation.mutateAsync(empresaData);
      
      // Sincronizar cache do PDF após salvar com sucesso
      await refreshData();
      
      toast.success('Dados da empresa salvos com sucesso!');
      console.log('[EmpresaPage] Dados salvos e cache sincronizado para PDF');
    } catch (error) {
      console.error('[EmpresaPage] Erro ao salvar dados:', error);
      toast.error('Erro ao salvar dados da empresa');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem');
      return;
    }

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 3MB');
      return;
    }

    setUploadingLogo(true);
    try {
      await uploadLogoMutation.mutateAsync(file);
      toast.success('Logo enviado com sucesso!');
    } catch (error) {
      toast.error('Erro ao enviar logo');
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!empresaData.logo_url) return;

    try {
      await removeLogoMutation.mutateAsync();
      setEmpresaData({ ...empresaData, logo_url: '' });
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover logo');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/dashboard')}
              className="mr-2 hover:bg-muted min-h-[44px] px-3 py-2 sm:px-4 sm:py-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Dados da Empresa
              </h1>
              <p className="text-muted-foreground">
                Configure as informações da sua empresa
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Company Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
              <CardDescription>
                Dados básicos da sua empresa que serão utilizados nos documentos e relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="shop_name" className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4" />
                  <span>Nome da Empresa *</span>
                </Label>
                <Input
                  id="shop_name"
                  value={empresaData.shop_name}
                  onChange={(e) => handleInputChange('shop_name', e.target.value)}
                  placeholder="Digite o nome da empresa"
                  className={cn(empresaErrors.shop_name && "border-destructive")}
                />
                {empresaErrors.shop_name && (
                  <p className="text-sm text-destructive flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.shop_name}</span>
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4" />
                  <span>Endereço Completo *</span>
                </Label>
                <Input
                  id="address"
                  value={empresaData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  className={cn(empresaErrors.address && "border-destructive")}
                />
                {empresaErrors.address && (
                  <p className="text-sm text-destructive flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.address}</span>
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-2">
                <Label htmlFor="contact_phone" className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <span>Telefone de Contato *</span>
                </Label>
                <Input
                  id="contact_phone"
                  value={empresaData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={cn(empresaErrors.contact_phone && "border-destructive")}
                />
                {empresaErrors.contact_phone && (
                  <p className="text-sm text-destructive flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.contact_phone}</span>
                  </p>
                )}
              </div>

              {/* CNPJ */}
              <div className="space-y-2">
                <Label htmlFor="cnpj" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>CNPJ</span>
                </Label>
                <Input
                  id="cnpj"
                  value={empresaData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={cn(empresaErrors.cnpj && "border-destructive")}
                />
                {empresaErrors.cnpj && (
                  <p className="text-sm text-destructive flex items-center space-x-1">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.cnpj}</span>
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Logo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ImageIcon className="w-5 h-5" />
                <span>Logo da Empresa</span>
              </CardTitle>
              <CardDescription>
                Faça upload da logo da sua empresa (máximo 3MB)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Logo */}
              {empresaData.logo_url && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Logo atual:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </Button>
                  </div>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <img
                      src={empresaData.logo_url}
                      alt="Logo da empresa"
                      className="max-w-xs max-h-32 object-contain mx-auto"
                    />
                  </div>
                </div>
              )}

              {/* Upload Logo */}
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="w-full"
                >
                  {uploadingLogo ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                  ) : (
                    <Upload className="w-4 h-4 mr-2" />
                  )}
                  {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleEmpresaSubmit}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Salvando...' : 'Salvar Dados'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}