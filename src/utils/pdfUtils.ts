import jsPDF from 'jspdf';
import { getCachedCompanyData, CompanyDataForPDF } from '../hooks/useCompanyDataLoader';

export interface BudgetData {
  id: string;
  client_name: string;
  client_email?: string;
  client_phone?: string;
  device_type: string;
  device_model: string;
  part_type?: string;
  part_quality?: string;
  total_price: number;
  installment_price?: number;
  installments?: number;
  created_at: string;
  warranty_months?: number;
  notes?: string;
}

export interface CompanyData {
  shop_name?: string;
  address?: string;
  contact_phone?: string;
  logo_url?: string;
  email?: string;
  cnpj?: string;
}

// Função auxiliar para carregar imagem com retry e timeout
const loadImage = (url: string, retries: number = 3, timeout: number = 10000): Promise<string> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const tryLoad = () => {
      attempts++;
      // Loading logo attempt
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Timeout para evitar travamento
      const timeoutId = setTimeout(() => {
        // Logo loading timeout
        img.src = ''; // Cancela o carregamento
        if (attempts < retries) {
          setTimeout(tryLoad, 1000); // Retry após 1 segundo
        } else {
          reject(new Error(`Timeout ao carregar imagem após ${retries} tentativas`));
        }
      }, timeout);
      
      img.crossOrigin = 'anonymous';
      img.onload = function() {
        clearTimeout(timeoutId);
        try {
          canvas.width = 72;
          canvas.height = 72;
          ctx?.drawImage(img, 0, 0, 72, 72);
          const dataURL = canvas.toDataURL('image/jpeg', 1.0);
          // Logo loaded successfully
          resolve(dataURL);
        } catch (error) {
          console.error(`[PDF] Erro ao processar imagem:`, error);
          if (attempts < retries) {
            setTimeout(tryLoad, 1000);
          } else {
            reject(error);
          }
        }
      };
      
      img.onerror = function() {
        clearTimeout(timeoutId);
        // Logo loading error
        if (attempts < retries) {
          setTimeout(tryLoad, 1000); // Retry após 1 segundo
        } else {
          reject(new Error(`Falha ao carregar imagem após ${retries} tentativas`));
        }
      };
      
      img.src = url;
    };
    
    tryLoad();
  });
};

// Função para validar e normalizar dados da empresa com prioridade para dados da página /empresa
export const validateCompanyData = (companyData?: CompanyData): CompanyData => {
  // Company data received - prioritizing /empresa page data
  
  // Primeiro, tentar usar o cache local sincronizado
  const localCache = getLocalCompanyCache();
  let fallbackData: CompanyDataForPDF | null = null;
  
  if (localCache?.hasData) {
    console.log('[PDF Utils] Usando cache local sincronizado da página /empresa');
    fallbackData = localCache.data;
  } else {
    // Fallback para o cache do hook com prioridade para shop_profiles (dados da página /empresa)
    const cachedData = getCachedCompanyData();
    if (cachedData?.hasData) {
      console.log('[PDF Utils] Usando cache do hook com prioridade para dados da página /empresa');
      try {
        // Priorizar dados do shop_profiles (página /empresa) sobre company_info
        const shopData = cachedData.shopProfile; // Dados da página /empresa
        const companyInfo = cachedData.companyInfo; // Dados das configurações antigas
        
        fallbackData = {
          // Priorizar sempre dados da página /empresa (shop_profiles)
          shop_name: shopData?.shop_name || companyInfo?.name || 'Minha Empresa',
          address: shopData?.address || companyInfo?.address || '',
          contact_phone: shopData?.contact_phone || companyInfo?.whatsapp_phone || '',
          logo_url: shopData?.logo_url || companyInfo?.logo_url || '',
          email: companyInfo?.email || '', // Email ainda vem do company_info
          cnpj: shopData?.cnpj || ''
        };
      } catch (error) {
        console.warn('Erro ao processar dados do cache:', error);
      }
    }
  }
  
  const validated: CompanyData = {
    shop_name: companyData?.shop_name || fallbackData?.shop_name || 'Minha Loja',
    address: companyData?.address || fallbackData?.address || '',
    contact_phone: companyData?.contact_phone || fallbackData?.contact_phone || '',
    logo_url: companyData?.logo_url || fallbackData?.logo_url || '',
    email: companyData?.email || fallbackData?.email || '',
    cnpj: companyData?.cnpj || fallbackData?.cnpj || ''
  };
  
  console.log('[PDF Utils] Dados validados da página /empresa:', { shop_name: validated.shop_name, hasLocalCache: !!localCache, hasFallback: !!fallbackData });
  return validated;
};

export const generateBudgetPDF = async (budget: BudgetData, companyData?: CompanyData): Promise<Blob> => {
  // Starting PDF generation
  // Budget data
  
  // Verificar se temos dados mínimos necessários
  const cachedData = getCachedCompanyData();
  if (!companyData && (!cachedData || !cachedData.hasData)) {
    console.warn('Dados da empresa não encontrados. Usando dados padrão.');
  }
  
  // Validar e normalizar dados da empresa com cache inteligente
  const validatedCompanyData = validateCompanyData(companyData);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 10; // Reduzir margem
  let yPosition = 15; // Começar mais próximo do topo

  // Cores minimalistas e profissionais
  const darkGray = [64, 64, 64]; // Cinza escuro para texto
  const lightGray = [240, 240, 240]; // Cinza claro para backgrounds
  const mediumGray = [128, 128, 128]; // Cinza médio para bordas
  const headerGray = [200, 200, 200]; // Cinza para headers de tabela
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  
  // Header profissional e compacto
  // Logo - usar imagem real se disponível com retry
  let logoLoaded = false;
  const logoSize = 18; // Reduzir tamanho do logo
  if (validatedCompanyData.logo_url && validatedCompanyData.logo_url.trim() !== '') {
    try {
      // Attempting to load logo
      const logoDataURL = await loadImage(validatedCompanyData.logo_url, 3, 8000);
      doc.addImage(logoDataURL, 'JPEG', margin, yPosition - 2, logoSize, logoSize);
      logoLoaded = true;
      // Logo loaded and added
    } catch (error) {
      // Logo loading failed, using placeholder
      logoLoaded = false;
    }
  }
  
  // Placeholder elegante quando não há logo ou falha no carregamento
  if (!logoLoaded) {
    // Using logo placeholder
    doc.setDrawColor(...mediumGray);
    doc.setLineWidth(0.8);
    doc.roundedRect(margin, yPosition - 2, logoSize, logoSize, 3, 3, 'S');
    doc.setTextColor(...mediumGray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text('LOGO', margin + 7, yPosition + 10);
  }
  
  // Nome da empresa (usar dados validados) - posicionamento compacto
  doc.setTextColor(...black);
  doc.setFontSize(14); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text(validatedCompanyData.shop_name, margin + logoSize + 6, yPosition + 5);
  // Company name added
  
  // Subtítulo compacto
  doc.setTextColor(...darkGray);
  doc.setFontSize(8); // Reduzir fonte
  doc.setFont('helvetica', 'normal');
  doc.text('Assistência Técnica Especializada', margin + logoSize + 6, yPosition + 12);
  
  // Funções auxiliares para formatação
  const formatPhone = (phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };
  
  const formatCNPJ = (cnpj: string): string => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length === 14) {
      return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
    }
    return cnpj;
  };
  
  // Adicionar dados da empresa no cabeçalho (lado direito) - usar dados validados
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);
  const rightX = pageWidth - margin;
  let rightY = yPosition;
  
  if (validatedCompanyData.contact_phone && validatedCompanyData.contact_phone.trim() !== '') {
    const formattedPhone = formatPhone(validatedCompanyData.contact_phone);
    doc.setFont('helvetica', 'bold');
    doc.text(`Tel: ${formattedPhone}`, rightX, rightY, { align: 'right' });
    rightY += 5;
    // Phone added
  }
  
  if (validatedCompanyData.cnpj && validatedCompanyData.cnpj.trim() !== '') {
    const formattedCNPJ = formatCNPJ(validatedCompanyData.cnpj);
    doc.setFont('helvetica', 'normal');
    doc.text(`CNPJ: ${formattedCNPJ}`, rightX, rightY, { align: 'right' });
    rightY += 5;
    // CNPJ added
  }
  
  if (validatedCompanyData.email && validatedCompanyData.email.trim() !== '') {
    doc.setFont('helvetica', 'normal');
    doc.text(`Email: ${validatedCompanyData.email}`, rightX, rightY, { align: 'right' });
    rightY += 5;
    // Email added
  }
  
  if (validatedCompanyData.address && validatedCompanyData.address.trim() !== '') {
    doc.setFont('helvetica', 'normal');
    
    // Validação e limpeza do endereço
    let cleanAddress = validatedCompanyData.address.trim();
    // Remover quebras de linha manuais e caracteres especiais problemáticos
    cleanAddress = cleanAddress.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ');
    
    // Verificar se o endereço não é apenas espaços ou caracteres especiais
    if (cleanAddress && cleanAddress.length > 0) {
      // Calcular largura máxima baseada no espaço disponível
      const availableWidth = rightX - margin - 10; // Margem de segurança
      const maxWidth = Math.min(80, availableWidth);
      
      // Quebrar endereço em múltiplas linhas se necessário
      const addressLines = doc.splitTextToSize(cleanAddress, maxWidth);
      
      // Verificar se há espaço suficiente para todas as linhas
      const totalAddressHeight = addressLines.length * 4 + 4; // 4 para o label
      const pageHeight = doc.internal.pageSize.height;
      const footerSpace = 40;
      
      if (rightY + totalAddressHeight < pageHeight - footerSpace) {
        doc.text('Endereço:', rightX, rightY, { align: 'right' });
        rightY += 4;
        
        // Renderizar cada linha do endereço com espaçamento consistente
        addressLines.forEach((line: string, index: number) => {
          if (line && line.trim()) { // Verificar se a linha não está vazia
            doc.text(line.trim(), rightX, rightY + (index * 4), { align: 'right' });
          }
        });
        
        rightY += addressLines.length * 4;
        // Address added successfully
      }
    }
  }
  
  yPosition += 25; // Reduzir espaçamento
  
  // Título "ORDEM DE SERVIÇO" centralizado e compacto
  doc.setFillColor(...darkGray);
  doc.rect(margin, yPosition - 3, pageWidth - 2 * margin, 14, 'F'); // Reduzir altura
  
  doc.setTextColor(...white);
  doc.setFontSize(12); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  const titleText = 'ORDEM DE SERVIÇO';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition + 5);
  
  yPosition += 20; // Reduzir espaçamento
  
  // Seção de datas em formato de tabela com bordas (compacta)
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  
  // Cabeçalho da tabela de datas - compacto
  doc.setFillColor(...headerGray);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 10, 'FD'); // Reduzir altura
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 10, 'FD');
  
  doc.setTextColor(...black);
  doc.setFontSize(7); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text('DATA DE EMISSÃO', margin + 2, yPosition + 7);
  doc.text('VÁLIDO ATÉ', margin + (pageWidth - 2 * margin) / 2 + 2, yPosition + 7);
  
  yPosition += 10;
  
  // Dados da tabela de datas
  doc.setFillColor(...white);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 10, 'FD'); // Reduzir altura
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 10, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(budget.created_at).toLocaleDateString('pt-BR'), margin + 2, yPosition + 7);
  
  const validityDate = budget.validity_date 
    ? new Date(budget.validity_date).toLocaleDateString('pt-BR')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  doc.text(validityDate, margin + (pageWidth - 2 * margin) / 2 + 2, yPosition + 7);
  
  yPosition += 15; // Reduzir espaçamento
  
  // Seção "DETALHES DO SERVIÇO" - compacta
  doc.setTextColor(...black);
  doc.setFontSize(9); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DO SERVIÇO', margin, yPosition);
  
  yPosition += 8; // Reduzir espaçamento
  
  // Tabela de detalhes do serviço (ultra compacta)
  // Cabeçalho
  doc.setFillColor(...darkGray);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 10, 'F'); // Reduzir altura
  doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 10, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(7); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', margin + 2, yPosition + 7);
  doc.text('DESCRIÇÃO', margin + (pageWidth - 2 * margin) / 3 + 2, yPosition + 7);
  
  yPosition += 10;
  
  // Linhas da tabela
  const serviceDetails = [
    ['Modelo', budget.device_model],
    ['Qualidade da peça', budget.part_quality]
  ];
  
  serviceDetails.forEach((detail, index) => {
    const bgColor = index % 2 === 0 ? lightGray : white;
    doc.setFillColor(...bgColor);
    doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 10, 'FD'); // Reduzir altura
    doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 10, 'FD');
    
    doc.setTextColor(...black);
    doc.setFontSize(7); // Reduzir fonte
    doc.setFont('helvetica', 'normal');
    doc.text(detail[0], margin + 2, yPosition + 7);
    doc.text(detail[1], margin + (pageWidth - 2 * margin) / 3 + 2, yPosition + 7);
    
    yPosition += 10; // Reduzir altura
  });
  
  yPosition += 10; // Reduzir espaçamento
  
  // Seção "VALORES DO SERVIÇO" - compacta
  doc.setTextColor(...black);
  doc.setFontSize(9); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text('VALORES DO SERVIÇO', margin, yPosition);
  
  yPosition += 8; // Reduzir espaçamento
  
  // Tabela de valores com bordas (compacta)
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  
  // Valor à vista - compacto
  doc.setFillColor(...white);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD'); // Reduzir altura
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(7); // Reduzir fonte
  doc.setFont('helvetica', 'normal');
  doc.text('VALOR À VISTA', margin + 3, yPosition + 5);
  
  doc.setTextColor(...black);
  doc.setFontSize(10); // Reduzir fonte
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${budget.total_price.toFixed(2).replace('.', ',')}`, margin + 3, yPosition + 10);
  
  yPosition += 12;
  
  // Valor parcelado (se disponível) - compacto
  if (budget.installment_price && budget.installment_count) {
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 12, 'FD'); // Reduzir altura
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(7); // Reduzir fonte
    doc.setFont('helvetica', 'normal');
    doc.text('VALOR PARCELADO', margin + 3, yPosition + 5);
    
    doc.setTextColor(...black);
    doc.setFontSize(10); // Reduzir fonte
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${budget.installment_price.toFixed(2).replace('.', ',')} em ${budget.installment_count}x`, margin + 3, yPosition + 10);
    
    yPosition += 12;
    
    // Método de pagamento - compacto
    doc.setTextColor(...darkGray);
    doc.setFontSize(6); // Reduzir fonte
    doc.setFont('helvetica', 'normal');
    doc.text('Método de Pagamento: Cartão de Crédito', margin + 3, yPosition + 4);
    
    yPosition += 6; // Reduzir espaçamento
  }
  
  yPosition += 8; // Reduzir espaçamento
  
  // Seção "GARANTIA" (ultra compacta)
  if (budget.warranty_months) {
    doc.setTextColor(...black);
    doc.setFontSize(9); // Reduzir fonte
    doc.setFont('helvetica', 'bold');
    doc.text('GARANTIA', margin, yPosition);
    
    yPosition += 6; // Reduzir espaçamento
    
    // Box de garantia - compacto
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 14, 'FD'); // Reduzir altura
    
    doc.setTextColor(...black);
    doc.setFontSize(8); // Reduzir fonte
    doc.setFont('helvetica', 'bold');
    doc.text(`Prazo: ${budget.warranty_months} meses`, margin + 3, yPosition + 6);
    
    doc.setFontSize(6); // Reduzir fonte
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text('* Garantia não cobre danos por queda, impacto ou líquidos', margin + 3, yPosition + 11);
    
    yPosition += 18; // Reduzir espaçamento
  }
  
  // Seção "SERVIÇOS INCLUSOS" aprimorada - só aparece se houver serviços ativos
  const includedServices = [];
  if (budget.includes_delivery === true) {
    includedServices.push('✓ Busca e entrega do aparelho');
  }
  if (budget.includes_screen_protector === true) {
    includedServices.push('✓ Película 3D de brinde');
  }
  
  if (includedServices.length > 0) {
    // Calcular altura total necessária para a seção
    const titleHeight = 10;
    const containerHeight = includedServices.length * 8 + 6;
    const noteHeight = includedServices.length === 2 ? 10 : 0;
    const totalSectionHeight = titleHeight + containerHeight + noteHeight + 6;
    
    // Verificar se há espaço suficiente na página atual
    const pageHeight = doc.internal.pageSize.height;
    const footerSpace = 40; // Espaço reservado para rodapé
    const availableSpace = pageHeight - yPosition - footerSpace;
    
    // Se não há espaço suficiente, adicionar nova página
    if (totalSectionHeight > availableSpace) {
      doc.addPage();
      yPosition = margin + 20; // Reset position with top margin
    }
    
    // Título da seção com destaque - compacto
    doc.setFillColor(...darkGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, titleHeight, 'F');
    
    doc.setTextColor(...white);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇOS INCLUSOS', margin + 3, yPosition + 7);
    
    yPosition += titleHeight;
    
    // Container dos serviços com fundo destacado - compacto
    doc.setFillColor(245, 248, 250); // Azul muito claro
    doc.setDrawColor(...mediumGray);
    doc.setLineWidth(0.5);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, containerHeight, 'FD');
    
    yPosition += 4; // Espaçamento interno
    
    includedServices.forEach((service, index) => {
      doc.setTextColor(...black);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Texto do serviço com check mark
      doc.text(service, margin + 6, yPosition + 6 + (index * 8));
    });
    
    yPosition += includedServices.length * 8 + 6;
    
    // Nota explicativa quando ambos os serviços estão inclusos - compacta
    if (includedServices.length === 2) {
      doc.setTextColor(...darkGray);
      doc.setFontSize(6);
      doc.setFont('helvetica', 'italic');
      doc.text('* Serviços inclusos sem custo adicional', margin + 3, yPosition + 4);
      yPosition += 6;
    }
    
    yPosition += 3; // Espaçamento final
  }
  
  // Rodapé
  const footerY = doc.internal.pageSize.height - 30;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  
// Footer text removed to avoid bugs
  
  // Retornar o PDF como Blob para compartilhamento
  const pdfBlob = doc.output('blob');
  // PDF generated successfully
  return pdfBlob;
};

// Função auxiliar para salvar o PDF localmente
export const saveBudgetPDF = async (budget: BudgetData, companyData?: CompanyData) => {
  // Starting PDF save
  
  try {
    const pdfBlob = await generateBudgetPDF(budget, companyData);
    const validatedCompanyData = validateCompanyData(companyData);
    const fileName = `orcamento-${validatedCompanyData.shop_name.replace(/\s+/g, '-').toLowerCase()}-${budget.device_model.replace(/\s+/g, '-').toLowerCase()}-${new Date().getTime()}.pdf`;
    
    // Generated filename
    
    // Criar link para download
    const url = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Download started successfully
  } catch (error) {
    console.error('Erro ao gerar/salvar PDF:', error);
    throw new Error('Falha ao gerar PDF. Verifique os dados da empresa.');
  }
};

// Função utilitária para verificar se temos dados suficientes para PDF
// Prioriza dados da página /empresa (shopProfile) sobre configurações antigas
export const hasValidCompanyDataForPDF = (): boolean => {
  console.log('[hasValidCompanyDataForPDF] Iniciando verificação...');
  
  // Verificar cache local primeiro
  const localCache = getLocalCompanyCache();
  console.log('[hasValidCompanyDataForPDF] Cache local:', localCache);
  
  const cachedData = getCachedCompanyData();
  
  console.log('[hasValidCompanyDataForPDF] Verificando dados:', {
    hasCachedData: !!cachedData,
    hasData: cachedData?.hasData,
    shopProfile: cachedData?.shopProfile,
    companyInfo: cachedData?.companyInfo,
    localCacheExists: !!localCache,
    localCacheHasData: localCache?.hasData
  });
  
  if (cachedData?.hasData) {
    const shopData = cachedData.shopProfile; // Dados da página /empresa
    const companyInfo = cachedData.companyInfo; // Dados das configurações antigas
    
    // Priorizar dados da página /empresa
    const shopName = shopData?.shop_name || companyInfo?.name;
    const hasValidName = !!(shopName && shopName !== 'Minha Empresa' && shopName !== 'Minha Loja');
    
    console.log('[hasValidCompanyDataForPDF] Análise detalhada:', {
      shopName: shopData?.shop_name,
      companyName: companyInfo?.name,
      finalShopName: shopName,
      hasValidName,
      shopDataExists: !!shopData,
      companyInfoExists: !!companyInfo
    });
    
    // Verificar se temos pelo menos nome válido da página /empresa
    if (shopData?.shop_name && shopData.shop_name !== 'Minha Empresa' && shopData.shop_name !== 'Minha Loja') {
      console.log('[hasValidCompanyDataForPDF] Dados válidos encontrados na página /empresa');
      return true;
    }
    
    // Fallback para dados das configurações antigas se não tiver dados da /empresa
    console.log('[hasValidCompanyDataForPDF] Usando fallback para configurações antigas:', hasValidName);
    return hasValidName;
  }
  
  console.log('[hasValidCompanyDataForPDF] Nenhum dado válido encontrado');
  return false;
};

// Cache local para sincronização com useCompanyDataLoader
let localCompanyCache: { data: CompanyData; hasData: boolean; timestamp: number } | null = null;

// Função para atualizar o cache local (chamada pelo useCompanyDataLoader)
export const updateCompanyDataCache = (data: CompanyData, hasData: boolean) => {
  localCompanyCache = {
    data,
    hasData,
    timestamp: Date.now()
  };
  console.log('[PDF Utils] Cache atualizado:', { hasData, shopName: data.shop_name });
};

// Função para obter dados do cache local
export const getLocalCompanyCache = () => {
  return localCompanyCache;
};

export default generateBudgetPDF;