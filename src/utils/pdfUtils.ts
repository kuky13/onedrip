import jsPDF from 'jspdf';

export interface BudgetData {
  id: string;
  device_model: string;
  piece_quality: string;
  total_price: number;
  installment_price?: number;
  installment_count?: number;
  created_at: string;
  validity_date?: string;
  warranty_months?: number;
  notes?: string;
  includes_delivery?: boolean;
  includes_screen_protector?: boolean;
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

// Função para validar e normalizar dados da empresa
const validateCompanyData = (companyData?: CompanyData): CompanyData => {
  // Company data received
  
  const validated: CompanyData = {
    shop_name: companyData?.shop_name || 'Minha Loja',
    address: companyData?.address || '',
    contact_phone: companyData?.contact_phone || '',
    logo_url: companyData?.logo_url || '',
    email: companyData?.email || '',
    cnpj: companyData?.cnpj || ''
  };
  
  // Company data validated
  return validated;
};

export const generateBudgetPDF = async (budget: BudgetData, companyData?: CompanyData): Promise<Blob> => {
  // Starting PDF generation
  // Budget data
  
  // Validar e normalizar dados da empresa
  const validatedCompanyData = validateCompanyData(companyData);
  
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let yPosition = 20;

  // Cores minimalistas e profissionais
  const darkGray = [64, 64, 64]; // Cinza escuro para texto
  const lightGray = [240, 240, 240]; // Cinza claro para backgrounds
  const mediumGray = [128, 128, 128]; // Cinza médio para bordas
  const headerGray = [200, 200, 200]; // Cinza para headers de tabela
  const white = [255, 255, 255];
  const black = [0, 0, 0];
  
  // Header simples e compacto
  // Logo - usar imagem real se disponível com retry
  let logoLoaded = false;
  if (validatedCompanyData.logo_url && validatedCompanyData.logo_url.trim() !== '') {
    try {
      // Attempting to load logo
      const logoDataURL = await loadImage(validatedCompanyData.logo_url, 3, 8000);
      doc.addImage(logoDataURL, 'JPEG', margin, yPosition - 5, 18, 18);
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
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, yPosition - 5, 18, 18, 2, 2, 'S');
    doc.setTextColor(...mediumGray);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('LOGO', margin + 6, yPosition + 3);
  }
  
  // Nome da empresa (usar dados validados)
  doc.setTextColor(...black);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(validatedCompanyData.shop_name, margin + 25, yPosition + 3);
  // Company name added
  
  // Subtítulo
  doc.setTextColor(...darkGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Assistência Técnica Especializada', margin + 25, yPosition + 10);
  
  // Adicionar dados da empresa no cabeçalho (lado direito) - usar dados validados
  doc.setFontSize(7);
  doc.setTextColor(...darkGray);
  const rightX = pageWidth - margin;
  let rightY = yPosition;
  
  if (validatedCompanyData.contact_phone && validatedCompanyData.contact_phone.trim() !== '') {
    doc.text(`Tel: ${validatedCompanyData.contact_phone}`, rightX, rightY, { align: 'right' });
    rightY += 4;
    // Phone added
  }
  
  if (validatedCompanyData.cnpj && validatedCompanyData.cnpj.trim() !== '') {
    doc.text(`CNPJ: ${validatedCompanyData.cnpj}`, rightX, rightY, { align: 'right' });
    rightY += 4;
    // CNPJ added
  }
  
  if (validatedCompanyData.address && validatedCompanyData.address.trim() !== '') {
    doc.text(`Endereço: ${validatedCompanyData.address}`, rightX, rightY, { align: 'right' });
    // Address added
  }
  
  yPosition += 30;
  
  // Título "ORÇAMENTO DE SERVIÇO" centralizado com background
  doc.setFillColor(...lightGray);
  doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 15, 'F');
  
  doc.setTextColor(...black);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleText = 'ORDEM DE SERVIÇO';
  const titleWidth = doc.getTextWidth(titleText);
  doc.text(titleText, (pageWidth - titleWidth) / 2, yPosition + 3);
  
  yPosition += 25;
  
  // Seção de datas em formato de tabela com bordas (compacta)
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  
  // Cabeçalho da tabela de datas
  doc.setFillColor(...headerGray);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  
  doc.setTextColor(...black);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DATA DE EMISSÃO', margin + 3, yPosition + 8);
  doc.text('VÁLIDO ATÉ', margin + (pageWidth - 2 * margin) / 2 + 3, yPosition + 8);
  
  yPosition += 12;
  
  // Dados da tabela de datas
  doc.setFillColor(...white);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  doc.rect(margin + (pageWidth - 2 * margin) / 2, yPosition, (pageWidth - 2 * margin) / 2, 12, 'FD');
  
  doc.setFont('helvetica', 'normal');
  doc.text(new Date(budget.created_at).toLocaleDateString('pt-BR'), margin + 3, yPosition + 8);
  
  const validityDate = budget.validity_date 
    ? new Date(budget.validity_date).toLocaleDateString('pt-BR')
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR');
  doc.text(validityDate, margin + (pageWidth - 2 * margin) / 2 + 3, yPosition + 8);
  
  yPosition += 20;
  
  // Seção "DETALHES DO SERVIÇO"
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('DETALHES DO SERVIÇO', margin, yPosition);
  
  yPosition += 10;
  
  // Tabela de detalhes do serviço (compacta)
  // Cabeçalho
  doc.setFillColor(...darkGray);
  doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 12, 'F');
  doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 12, 'F');
  
  doc.setTextColor(...white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM', margin + 3, yPosition + 8);
  doc.text('DESCRIÇÃO', margin + (pageWidth - 2 * margin) / 3 + 3, yPosition + 8);
  
  yPosition += 12;
  
  // Linhas da tabela
  const serviceDetails = [
    ['Modelo', budget.device_model],
    ['Qualidade da peça', budget.piece_quality]
  ];
  
  serviceDetails.forEach((detail, index) => {
    const bgColor = index % 2 === 0 ? lightGray : white;
    doc.setFillColor(...bgColor);
    doc.rect(margin, yPosition, (pageWidth - 2 * margin) / 3, 12, 'FD');
    doc.rect(margin + (pageWidth - 2 * margin) / 3, yPosition, 2 * (pageWidth - 2 * margin) / 3, 12, 'FD');
    
    doc.setTextColor(...black);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(detail[0], margin + 3, yPosition + 8);
    doc.text(detail[1], margin + (pageWidth - 2 * margin) / 3 + 3, yPosition + 8);
    
    yPosition += 12;
  });
  
  yPosition += 15;
  
  // Seção "VALORES DO SERVIÇO"
  doc.setTextColor(...black);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VALORES DO SERVIÇO', margin, yPosition);
  
  yPosition += 10;
  
  // Tabela de valores com bordas (compacta)
  doc.setDrawColor(...mediumGray);
  doc.setLineWidth(0.5);
  
  // Valor à vista
  doc.setFillColor(...white);
  doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'FD');
  
  doc.setTextColor(...darkGray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('VALOR À VISTA', margin + 5, yPosition + 6);
  
  doc.setTextColor(...black);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${budget.total_price.toFixed(2).replace('.', ',')}`, margin + 5, yPosition + 12);
  
  yPosition += 15;
  
  // Valor parcelado (se disponível)
  if (budget.installment_price && budget.installment_count) {
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'FD');
    
    doc.setTextColor(...darkGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('VALOR PARCELADO', margin + 5, yPosition + 6);
    
    doc.setTextColor(...black);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`R$ ${budget.installment_price.toFixed(2).replace('.', ',')} em ${budget.installment_count}x`, margin + 5, yPosition + 12);
    
    yPosition += 15;
    
    // Método de pagamento
    doc.setTextColor(...darkGray);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('Método de Pagamento: Cartão de Crédito', margin + 5, yPosition + 5);
    
    yPosition += 8;
  }
  
  yPosition += 12;
  
  // Seção "GARANTIA" (compacta)
  if (budget.warranty_months) {
    doc.setTextColor(...black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('GARANTIA', margin, yPosition);
    
    yPosition += 8;
    
    // Box de garantia
    doc.setFillColor(...lightGray);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'FD');
    
    doc.setTextColor(...black);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Prazo: ${budget.warranty_months} meses`, margin + 5, yPosition + 8);
    
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text('* Garantia não cobre danos por queda, impacto ou líquidos', margin + 5, yPosition + 15);
    
    yPosition += 25;
  }
  
  // Seção "SERVIÇOS INCLUSOS" (compacta) - só aparece se houver serviços ativos
  const includedServices = [];
  if (budget.includes_delivery === true) {
    includedServices.push('Busca e entrega do aparelho');
  }
  if (budget.includes_screen_protector === true) {
    includedServices.push('Película de proteção de brinde');
  }
  
  if (includedServices.length > 0) {
    doc.setTextColor(...black);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇOS INCLUSOS', margin, yPosition);
    
    yPosition += 8;
    
    doc.setDrawColor(...mediumGray);
    doc.setLineWidth(0.5);
    doc.setFillColor(...white);
    doc.rect(margin, yPosition, pageWidth - 2 * margin, includedServices.length * 10, 'FD');
    
    includedServices.forEach((service, index) => {
      doc.setTextColor(...black);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Texto do serviço sem bullet point
      doc.text(service, margin + 5, yPosition + 7 + (index * 10));
    });
    
    yPosition += includedServices.length * 10 + 5;
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
};

export default generateBudgetPDF;