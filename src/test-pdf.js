// Script de teste para geração de PDF
import { generateBudgetPDF } from './utils/pdfUtils.js';

// Dados de teste da empresa
const testCompanyData = {
  shop_name: 'OneDrip Assistência Técnica',
  address: 'Rua das Flores, 123\nCentro, São Paulo - SP\nCEP: 01234-567',
  contact_phone: '(11) 98765-4321',
  cnpj: '12.345.678/0001-90',
  logo_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO'
};

// Dados de teste do orçamento
const testBudgetData = {
  id: 'test-budget-001',
  client_name: 'João Silva',
  client_phone: '(11) 99999-9999',
  device_type: 'Smartphone',
  device_model: 'iPhone 12 Pro',
  total_price: 450.00,
  installment_price: 150.00,
  installments: 3,
  warranty_months: 6,
  notes: 'Tela quebrada e bateria viciada. Cliente relatou que o aparelho caiu e a tela rachou.',
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
};

// Função para testar a geração de PDF
export async function testPDFGeneration() {
  try {
    console.log('=== TESTE DE GERAÇÃO DE PDF ===');
    console.log('Dados da empresa:', testCompanyData);
    console.log('Dados do orçamento:', testBudgetData);
    
    console.log('Iniciando geração de PDF...');
    
    // Gerar o PDF
    const pdfBlob = await generateBudgetPDF(testBudgetData, testCompanyData);
    
    console.log('PDF gerado com sucesso!');
    console.log('Tamanho do PDF:', pdfBlob.size, 'bytes');
    
    // Criar URL para download
    const url = URL.createObjectURL(pdfBlob);
    
    // Criar link para download
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamento-teste-${new Date().getTime()}.pdf`;
    link.click();
    
    // Limpar URL
    URL.revokeObjectURL(url);
    
    console.log('Download do PDF iniciado!');
    
    return {
      success: true,
      message: 'PDF gerado e download iniciado com sucesso!',
      size: pdfBlob.size
    };
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return {
      success: false,
      message: `Erro ao gerar PDF: ${error.message}`,
      error: error
    };
  }
}

// Disponibilizar a função globalmente para teste no console
if (typeof window !== 'undefined') {
  window.testPDFGeneration = testPDFGeneration;
  console.log('Função testPDFGeneration() disponível no console!');
  console.log('Execute testPDFGeneration() para testar a geração de PDF.');
}

// Auto-executar se chamado diretamente
if (import.meta.url === window.location.href) {
  testPDFGeneration();
}