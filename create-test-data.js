// Script para criar dados de teste da empresa e orçamento

// Dados de teste da empresa (shop_profiles - página /empresa)
const testShopProfile = {
  id: 'test-shop-001',
  shop_name: 'TechRepair Pro',
  address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
  contact_phone: '(11) 98765-4321',
  cnpj: '12.345.678/0001-90',
  logo_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  owner_id: 'test-user'
};

// Dados de teste da empresa (company_info - configurações antigas)
const testCompanyInfo = {
  id: 'test-company-001',
  name: 'TechRepair Pro',
  address: 'Rua das Flores, 123 - Centro - São Paulo/SP',
  whatsapp_phone: '(11) 98765-4321',
  email: 'contato@techrepair.com',
  logo_url: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  owner_id: 'test-user'
};

// Orçamento de teste
const testBudget = {
  id: 'test-budget-001',
  client_name: 'João Silva',
  client_email: 'joao@email.com',
  client_phone: '(11) 99999-9999',
  device_type: 'Smartphone',
  device_model: 'iPhone 12',
  part_type: 'Tela',
  part_quality: 'Original',
  total_price: 350.00,
  installment_price: 175.00,
  installments: 2,
  created_at: new Date().toISOString(),
  warranty_months: 3,
  notes: 'Troca de tela com garantia',
  owner_id: 'test-user'
};

console.log('=== CRIANDO DADOS DE TESTE ===');

// Salvar shop_profiles no localStorage
const existingShopProfiles = JSON.parse(localStorage.getItem('shop_profiles') || '[]');
existingShopProfiles.push(testShopProfile);
localStorage.setItem('shop_profiles', JSON.stringify(existingShopProfiles));
console.log('✅ Shop Profile criado:', testShopProfile);

// Salvar company_info no localStorage
const existingCompanyInfo = JSON.parse(localStorage.getItem('company_info') || '[]');
existingCompanyInfo.push(testCompanyInfo);
localStorage.setItem('company_info', JSON.stringify(existingCompanyInfo));
console.log('✅ Company Info criado:', testCompanyInfo);

// Salvar orçamento no localStorage
const existingBudgets = JSON.parse(localStorage.getItem('budgets') || '[]');
// Remover orçamento existente com mesmo ID se houver
const filteredBudgets = existingBudgets.filter(b => b.id !== testBudget.id);
filteredBudgets.push(testBudget);
localStorage.setItem('budgets', JSON.stringify(filteredBudgets));
console.log('✅ Orçamento criado:', testBudget);

console.log('=== DADOS DE TESTE CRIADOS COM SUCESSO ===');
console.log('Agora você pode acessar /orcamento/test-budget-001 para testar o PDF');

// Verificar dados salvos
console.log('\n=== VERIFICAÇÃO DOS DADOS SALVOS ===');
console.log('Shop Profiles:', JSON.parse(localStorage.getItem('shop_profiles') || '[]'));
console.log('Company Info:', JSON.parse(localStorage.getItem('company_info') || '[]'));
console.log('Budgets:', JSON.parse(