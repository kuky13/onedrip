import React from 'react';
import { saveBudgetPDF } from '../../utils/pdfUtils';
import { Button } from '../ui/button';
import { FileText } from 'lucide-react';
import { toast } from 'sonner';

interface TestPDFButtonProps {
  className?: string;
}

const TestPDFButton: React.FC<TestPDFButtonProps> = ({ className }) => {
  const handleTestPDF = async () => {
    try {
      toast.info('Gerando PDF de teste...');
      
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
        client_email: 'joao.silva@email.com',
        client_phone: '(11) 99999-9999',
        device_type: 'Smartphone',
        device_model: 'iPhone 12 Pro',
        part_type: 'Tela',
        part_quality: 'Original',
        total_price: 450.00,
        installment_price: 150.00,
        installments: 3,
        warranty_months: 6,
        notes: 'Tela quebrada e bateria viciada. Cliente relatou que o aparelho caiu e a tela rachou.',
        created_at: new Date().toISOString()
      };
      
      console.log('=== TESTE DE GERAÇÃO DE PDF ===');
      console.log('Dados da empresa:', testCompanyData);
      console.log('Dados do orçamento:', testBudgetData);
      
      // Gerar e salvar o PDF usando a função integrada
      await saveBudgetPDF(testBudgetData, testCompanyData);
      
      toast.success('PDF gerado e download iniciado com sucesso!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  return (
    <Button
      onClick={handleTestPDF}
      variant="outline"
      size="sm"
      className={className}
    >
      <FileText className="h-4 w-4 mr-2" />
      Testar PDF
    </Button>
  );
};

export default TestPDFButton;