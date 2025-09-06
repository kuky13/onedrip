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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80">
      {/* Professional Header */}
      <div className="relative bg-gradient-to-r from-card via-card/95 to-card border-b border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
        <div className="relative max-w-6xl mx-auto p-6 md:p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="mr-2 hover:bg-muted/50 min-h-[44px] px-3 py-2 rounded-lg transition-all duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              <div className="hidden md:block w-px h-8 bg-border/50" />
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-xl">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                    Dados da Empresa
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Configure a identidade da sua empresa para documentos e relatórios
                  </p>
                </div>
              </div>
            </div>
            {empresaData.logo_url && (
              <div className="hidden lg:block">
                <div className="p-2 bg-background/50 rounded-lg border border-border/50">
                  <img
                    src={empresaData.logo_url}
                    alt="Logo atual"
                    className="w-12 h-12 object-contain rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto p-4 md:p-6 lg:p-8 space-y-8">
        {/* Progress Indicator */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${empresaData.shop_name ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Informações Básicas</p>
                  <p className="text-sm text-muted-foreground">
                    {empresaData.shop_name ? 'Concluído' : 'Pendente'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${empresaData.logo_url ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Logo da Empresa</p>
                  <p className="text-sm text-muted-foreground">
                    {empresaData.logo_url ? 'Configurado' : 'Opcional'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50 bg-gradient-to-br from-card to-card/50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${empresaData.contact_phone ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted-foreground'}`}>
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Contato</p>
                  <p className="text-sm text-muted-foreground">
                    {empresaData.contact_phone ? 'Configurado' : 'Pendente'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Company Information Card */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <span>Informações da Empresa</span>
                </CardTitle>
                <CardDescription className="mt-2">
                  Dados básicos da sua empresa que aparecerão nos documentos PDF, contratos e relatórios
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Company Name */}
              <div className="space-y-3">
                <Label htmlFor="shop_name" className="flex items-center space-x-2 text-sm font-medium">
                  <Building2 className="w-4 h-4 text-primary" />
                  <span>Nome da Empresa *</span>
                </Label>
                <Input
                  id="shop_name"
                  value={empresaData.shop_name}
                  onChange={(e) => handleInputChange('shop_name', e.target.value)}
                  placeholder="Digite o nome da empresa"
                  className={cn(
                    "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                    empresaErrors.shop_name && "border-destructive focus:ring-destructive/20"
                  )}
                />
                {empresaErrors.shop_name && (
                  <p className="text-sm text-destructive flex items-center space-x-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.shop_name}</span>
                  </p>
                )}
              </div>

              {/* Contact Phone */}
              <div className="space-y-3">
                <Label htmlFor="contact_phone" className="flex items-center space-x-2 text-sm font-medium">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>Telefone de Contato *</span>
                </Label>
                <Input
                  id="contact_phone"
                  value={empresaData.contact_phone}
                  onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={cn(
                    "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                    empresaErrors.contact_phone && "border-destructive focus:ring-destructive/20"
                  )}
                />
                {empresaErrors.contact_phone && (
                  <p className="text-sm text-destructive flex items-center space-x-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.contact_phone}</span>
                  </p>
                )}
              </div>

              {/* Address */}
              <div className="lg:col-span-2 space-y-3">
                <Label htmlFor="address" className="flex items-center space-x-2 text-sm font-medium">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>Endereço Completo *</span>
                </Label>
                <Input
                  id="address"
                  value={empresaData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  placeholder="Rua, número, bairro, cidade, estado, CEP"
                  className={cn(
                    "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                    empresaErrors.address && "border-destructive focus:ring-destructive/20"
                  )}
                />
                {empresaErrors.address && (
                  <p className="text-sm text-destructive flex items-center space-x-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.address}</span>
                  </p>
                )}
              </div>

              {/* CNPJ */}
              <div className="lg:col-span-2 space-y-3">
                <Label htmlFor="cnpj" className="flex items-center space-x-2 text-sm font-medium">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>CNPJ (Opcional)</span>
                </Label>
                <Input
                  id="cnpj"
                  value={empresaData.cnpj}
                  onChange={(e) => handleInputChange('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={cn(
                    "h-11 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
                    empresaErrors.cnpj && "border-destructive focus:ring-destructive/20"
                  )}
                />
                {empresaErrors.cnpj && (
                  <p className="text-sm text-destructive flex items-center space-x-1 animate-fade-in">
                    <AlertCircle className="w-4 h-4" />
                    <span>{empresaErrors.cnpj}</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Logo Card */}
        <Card className="border-border/50 bg-gradient-to-br from-card to-card/50 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center space-x-3 text-xl">
              <div className="p-2 bg-primary/20 rounded-lg">
                <ImageIcon className="w-5 h-5 text-primary" />
              </div>
              <span>Logo da Empresa</span>
            </CardTitle>
            <CardDescription>
              Adicione a logo da sua empresa para personalizar documentos (máximo 3MB)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Logo Preview */}
            {empresaData.logo_url && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Logo atual:</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/5"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                </div>
                <div className="border border-border/50 rounded-lg p-6 bg-gradient-to-br from-background to-muted/20">
                  <img
                    src={empresaData.logo_url}
                    alt="Logo da empresa"
                    className="max-w-xs max-h-32 object-contain mx-auto rounded-lg shadow-soft"
                  />
                </div>
              </div>
            )}

            {/* Upload Area */}
            <div className="space-y-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <div 
                className="border-2 border-dashed border-border/50 rounded-lg p-8 text-center bg-gradient-to-br from-muted/20 to-muted/10 hover:from-muted/30 hover:to-muted/20 transition-all duration-300 cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="space-y-4">
                  <div className="mx-auto w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
                    {uploadingLogo ? (
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
                    ) : (
                      <Upload className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {uploadingLogo ? 'Enviando logo...' : 'Clique para enviar logo'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG ou JPEG até 3MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button
            onClick={handleEmpresaSubmit}
            disabled={isSaving}
            className="min-w-[160px] h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground shadow-soft hover:shadow-medium transition-all duration-200"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent mr-2" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Dados
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}