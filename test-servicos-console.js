// Script para testar a seção SERVIÇOS INCLUSOS no console do navegador
// Cole este código no console do navegador na página http://localhost:8081/orcamento

(async function testServicosInclusos() {
  console.log('🧪 === TESTE SEÇÃO SERVIÇOS INCLUSOS ===');
  
  try {
    // Verificar se as funções estão disponíveis
    if (typeof window.generateBudgetPDF === 'undefined') {
      // Tentar importar dinamicamente
      const { generateBudgetPDF } = await import('./src/utils/pdfUtils.js');
      window.generateBudgetPDF = generateBudgetPDF;
    }
    
    // Dados de teste da empresa
    const testCompanyData = {
      shop_name: 'OneDrip Assistência Técnica',
      address: 'Rua das Flores, 123\nCentro, São Paulo - SP\nCEP: 01234-567',
      contact_phone: '(11) 98765-4321',
      email: 'contato@onedrip.com.br',
      cnpj: '12.345.678/0001-90',
      logo_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO'
    };
    
    // Dados de teste do orçamento com AMBOS os serviços inclusos
    const testBudgetData = {
      id: 'test-servicos-inclusos-001',
      client_name: 'Maria Santos - Teste Seção Serviços',
      client_phone: '(11) 88888-8888',
      device_type: 'Smartphone',
      device_model: 'Samsung Galaxy S21 Ultra',
      total_price: 650.00,
      installment_price: 216.67,
      installments: 3,
      warranty_months: 12,
      notes: 'Tela quebrada, bateria viciada, alto-falante com problema. Cliente relatou queda na água e posterior secagem inadequada. Aparelho apresenta oxidação em alguns componentes internos. Necessário limpeza completa da placa mãe.',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      part_quality: 'Original',
      includes_delivery: true,        // ✅ ATIVO - Busca e entrega
      includes_screen_protector: true, // ✅ ATIVO - Película 3D
      installment_count: 3,
      validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    console.log('📋 Dados do teste:');
    console.log('🏢 Empresa:', testCompanyData.shop_name);
    console.log('📱 Aparelho:', testBudgetData.device_model);
    console.log('🚚 Busca e Entrega:', testBudgetData.includes_delivery ? '✅ SIM' : '❌ NÃO');
    console.log('🛡️ Película 3D:', testBudgetData.includes_screen_protector ? '✅ SIM' : '❌ NÃO');
    
    console.log('\n🚀 Iniciando geração de PDF...');
    
    // Gerar o PDF
    const pdfBlob = await window.generateBudgetPDF(testBudgetData, testCompanyData);
    
    console.log('✅ PDF gerado com sucesso!');
    console.log('📊 Tamanho do PDF:', pdfBlob.size, 'bytes');
    
    // Criar URL para download
    const url = URL.createObjectURL(pdfBlob);
    
    // Criar link para download
    const link = document.createElement('a');
    link.href = url;
    link.download = `teste-servicos-inclusos-${new Date().getTime()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Limpar URL
    URL.revokeObjectURL(url);
    
    console.log('\n🎯 VERIFICAÇÃO:');
    console.log('1. Abra o PDF baixado');
    console.log('2. Procure pela seção "SERVIÇOS INCLUSOS"');
    console.log('3. Verifique se ela aparece COMPLETA em uma única página');
    console.log('4. Confirme que não há corte no meio da seção');
    
    console.log('\n📝 RESULTADO ESPERADO:');
    console.log('- Título "SERVIÇOS INCLUSOS" com fundo escuro');
    console.log('- ✓ Busca e entrega do aparelho');
    console.log('- ✓ Película 3D de brinde');
    console.log('- Nota: "* Serviços inclusos sem custo adicional"');
    console.log('- Tudo em uma única página, sem cortes');
    
    return {
      success: true,
      pdfSize: pdfBlob.size,
      message: 'PDF gerado com sucesso! Verifique se a seção SERVIÇOS INCLUSOS aparece completa.'
    };
    
  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    return {
      success: false,
      error: error.message || error,
      message: 'Falha na geração do PDF'
    };
  }
})();

// Função para teste rápido
window.testServicosInclusos = async function() {
  console.log('🔄 Executando teste rápido...');
  
  try {
    // Usar dados do TestPDFButton se disponível
    const testData = {
      id: 'quick-test',
      client_name: 'Teste Rápido',
      client_phone: '(11) 99999-9999',
      device_type: 'Smartphone',
      device_model: 'iPhone 12 Pro',
      total_price: 450.00,
      installment_price: 150.00,
      installments: 3,
      warranty_months: 6,
      notes: 'Teste da seção SERVIÇOS INCLUSOS',
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      part_quality: 'Original',
      includes_delivery: true,
      includes_screen_protector: true,
      installment_count: 3,
      validity_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    const companyData = {
      shop_name: 'OneDrip Assistência Técnica',
      address: 'Rua das Flores, 123\nCentro, São Paulo - SP\nCEP: 01234-567',
      contact_phone: '(11) 98765-4321',
      cnpj: '12.345.678/0001-90',
      logo_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO',
      email: 'contato@onedrip.com.br'
    };
    
    // Tentar usar a função global se disponível
    if (typeof window.generateBudgetPDF === 'function') {
      const pdfBlob = await window.generateBudgetPDF(testData, companyData);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `teste-rapido-servicos-${new Date().getTime()}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      
      console.log('✅ Teste rápido concluído! PDF baixado.');
    } else {
      console.log('⚠️ Função generateBudgetPDF não encontrada. Execute o script completo primeiro.');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste rápido:', error);
  }
};

console.log('\n🎮 COMANDOS DISPONÍVEIS:');
console.log('- testServicosInclusos() - Executa teste rápido');
console.log('\n📖 INSTRUÇÕES:');
console.log('1. Abra a página: http://localhost:8081/orcamento');
console.log('2. Abra o console do navegador (F12)');
console.log('3. Cole este script e pressione Enter');
console.log('4. Execute: testServicosInclusos()');
console.log('5. Verifique o PDF baixado');