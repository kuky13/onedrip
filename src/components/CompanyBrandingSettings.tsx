import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Upload, 
  Save, 
  Trash2, 
  AlertCircle,
  Image as ImageIcon,
  ExternalLink,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';


interface CompanyFormData {
  name: string;
  logo_url: string;
  whatsapp_phone: string;
  description: string;
}



const initialCompanyData: CompanyFormData = {
  name: '',
  logo_url: '',
  whatsapp_phone: '',
  description: ''
};





export function CompanyBrandingSettings() {
  const navigate = useNavigate();
  const {
    companyInfo,
    loading,
    createCompanyInfo,
    updateCompanyInfo,
    uploadLogo,
    removeLogo,
    formatPhoneNumber,
    generateWhatsAppLink,
    refreshData
  } = useCompanyBranding();

  const [companyData, setCompanyData] = useState<CompanyFormData>(initialCompanyData);
  const [companyErrors, setCompanyErrors] = useState<Partial<CompanyFormData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (companyInfo) {
      setCompanyData({
        name: companyInfo.name || '',
        logo_url: companyInfo.logo_url || '',
        whatsapp_phone: companyInfo.whatsapp_phone || '',
        description: companyInfo.description || ''
      });
    }
  }, [companyInfo]);



  const validateCompanyForm = (): boolean => {
    const errors: Partial<CompanyFormData> = {};

    if (!companyData.name.trim()) {
      errors.name = 'Nome da empresa é obrigatório';
    }

    if (companyData.whatsapp_phone && !companyData.whatsapp_phone.match(/^\d{10,15}$/)) {
      errors.whatsapp_phone = 'Número de WhatsApp inválido';
    }



    setCompanyErrors(errors);
    return Object.keys(errors).length === 0;
  };



  const handleCompanySubmit = async () => {
    if (!validateCompanyForm()) {
      return;
    }

    setIsSaving(true);
    try {
      const formattedData = {
        ...companyData,
        whatsapp_phone: companyData.whatsapp_phone ? formatPhoneNumber(companyData.whatsapp_phone) : ''
      };

      if (companyInfo) {
        await updateCompanyInfo(formattedData);
        toast.success('Informações da empresa atualizadas!');
      } else {
        await createCompanyInfo(formattedData);
        toast.success('Informações da empresa criadas!');
      }
    } catch (error) {
      toast.error('Erro ao salvar informações da empresa');
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 5MB');
      return;
    }

    setUploadingLogo(true);
    try {
      const logoUrl = await uploadLogo(file);
      setCompanyData({ ...companyData, logo_url: logoUrl });
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
    if (!companyData.logo_url) return;

    try {
      // @ts-ignore - Temporary fix for function signature mismatch
      await removeLogo(companyData.logo_url);
      setCompanyData({ ...companyData, logo_url: '' });
      toast.success('Logo removido com sucesso!');
    } catch (error) {
      toast.error('Erro ao remover logo');
    }
  };

  const openWhatsApp = () => {
    if (companyData.whatsapp_phone) {
      // @ts-ignore - Temporary fix for function signature mismatch
      const link = generateWhatsAppLink(companyData.whatsapp_phone, 'Olá! Gostaria de mais informações.');
      window.open(link, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/service-orders/settings')}
              className="mr-2 hover:bg-muted"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
            <div className="p-3 bg-primary/10 rounded-xl">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Marca da Empresa
              </h1>
              <p className="text-muted-foreground mt-1">
                Configure a identidade visual da sua empresa
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                companyData.name ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <Building2 className={cn(
                  'w-5 h-5',
                  companyData.name ? 'text-green-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Nome da Empresa</p>
                <p className="text-lg font-semibold text-foreground">
                  {companyData.name ? 'Configurado' : 'Não configurado'}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                companyData.logo_url ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <ImageIcon className={cn(
                  'w-5 h-5',
                  companyData.logo_url ? 'text-green-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Logo</p>
                <p className="text-lg font-semibold text-foreground">
                  {companyData.logo_url ? 'Configurado' : 'Não configurado'}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 border-border bg-card">
            <div className="flex items-center space-x-3">
              <div className={cn(
                'p-2 rounded-lg',
                companyData.whatsapp_phone ? 'bg-green-500/10' : 'bg-muted'
              )}>
                <Phone className={cn(
                  'w-5 h-5',
                  companyData.whatsapp_phone ? 'text-green-600' : 'text-muted-foreground'
                )} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">WhatsApp</p>
                <p className="text-lg font-semibold text-foreground">
                  {companyData.whatsapp_phone ? 'Ativo' : 'Inativo'}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="w-5 h-5" />
                <span>Informações da Empresa</span>
              </CardTitle>
              <CardDescription>
                Configure os dados básicos da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Company Name */}
              <div>
                <Label htmlFor="company_name">Nome da Empresa *</Label>
                <Input
                  id="company_name"
                  value={companyData.name}
                  onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                  placeholder="Minha Empresa Ltda"
                  className={companyErrors.name ? 'border-red-500' : ''}
                />
                {companyErrors.name && (
                  <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.name}
                  </p>
                )}
              </div>
              
              {/* Logo Upload */}
              <div>
                <Label>Logo da Empresa</Label>
                <div className="mt-2">
                  {companyData.logo_url ? (
                    <div className="flex items-center space-x-4">
                      <img
                        src={companyData.logo_url}
                        alt="Logo da empresa"
                        className="w-16 h-16 object-contain border rounded-lg"
                      />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600">Logo atual</p>
                        <div className="flex space-x-2 mt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingLogo}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            Alterar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRemoveLogo}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                      <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Nenhum logo enviado</p>
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingLogo}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploadingLogo ? 'Enviando...' : 'Enviar Logo'}
                      </Button>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 5MB
                  </p>
                </div>
              </div>
              
              {/* WhatsApp Phone */}
              <div>
                <Label htmlFor="whatsapp_phone">WhatsApp</Label>
                <div className="flex space-x-2">
                  <Input
                    id="whatsapp_phone"
                    value={companyData.whatsapp_phone}
                    onChange={(e) => setCompanyData({ ...companyData, whatsapp_phone: e.target.value })}
                    placeholder="11999999999"
                    className={cn('flex-1', companyErrors.whatsapp_phone ? 'border-red-500' : '')}
                  />
                  {companyData.whatsapp_phone && (
                    <Button
                      variant="outline"
                      onClick={openWhatsApp}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {companyErrors.whatsapp_phone && (
                  <p className="text-sm text-red-500 mt-1 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {companyErrors.whatsapp_phone}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Apenas números, sem espaços ou caracteres especiais
                </p>
              </div>
              

              
              {/* Description */}
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={companyData.description}
                  onChange={(e) => setCompanyData({ ...companyData, description: e.target.value })}
                  placeholder="Breve descrição da empresa..."
                  rows={3}
                />
              </div>
              
              <Button onClick={handleCompanySubmit} disabled={isSaving || loading} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar Informações'}
              </Button>
            </CardContent>
          </Card>


        </div>
      </div>


    </div>
  );
}