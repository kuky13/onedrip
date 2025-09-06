// Script para testar PDF no console do navegador
// Cole este código no console do navegador na página de orçamentos

(async function testPDF() {
  console.log('=== INICIANDO TESTE DE PDF ===');
  
  try {
    // Importar a função de geração de PDF
    const { generateBudgetPDF } = await import('./src/utils/pdfUtils.ts');
    
    // Dados de teste da empresa
    const testCompanyData = {
      shop_name: 'OneDrip Assistência Técnica',
      address: 'Rua das Flores, 123\nCentro, São Paulo - SP\nCEP: 01234-567',
      contact_phone: '(11) 98765-4321',
      cnpj: '12.345.678/0001-90',
      logo_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO',
      email: 'contato@onedrip.com.br'
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
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      part_quality: 'Original',
      includes_delivery: true,
      includes_screen_protector: true,
      installment_count: 3,
      validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    console.log('Dados da empresa:', testCompanyData);
    console.log('Dados do orçamento:', testBudgetData);
    
    // Gerar o PDF
    console.log('Gerando PDF...');
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
    
    console.log('Download iniciado!');
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    console.error('Stack trace:', error.stack);
  }
})();

// Instruções:
// 1. Abra a página de orçamentos (http://localhost:8081/orcamento)
// 2. Abra o console do navegador (F12)
// 3. Cole este código e pressione Enter
// 4. Verifique se o PDF é gerado e baixado
// 5. Abra o PDF e verifique se os dados da empresa estão corretos