import React, { useState } from 'react';
import { generateBudgetPDF, validateCompanyData } from '../../utils/pdfUtils';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { FileText, Eye, Download } from 'lucide-react';
import { toast } from 'sonner';

const PDFTestComponent: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const testCompanyData = {
    shop_name: 'OneDrip Assistência Técnica',
    address: 'Rua das Flores, 123\nCentro, São Paulo - SP\nCEP: 01234-567',
    contact_phone: '(11) 98765-4321',
    cnpj: '12.345.678/0001-90',
    logo_url: 'https://via.placeholder.com/150x150/007bff/ffffff?text=LOGO',
    email: 'contato@onedrip.com.br'
  };

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

  const handleValidateCompanyData = async () => {
    try {
      setIsLoading(true);
      console.log('=== TESTE DE VALIDAÇÃO DE DADOS DA EMPRESA ===');
      
      // Testar validação dos dados da empresa
      const validatedData = await validateCompanyData(testCompanyData);
      
      console.log('Dados originais:', testCompanyData);
      console.log('Dados validados:', validatedData);
      
      setTestResults({
        original: testCompanyData,
        validated: validatedData,
        timestamp: new Date().toISOString()
      });
      
      toast.success('Validação de dados concluída! Verifique o console.');
      
    } catch (error) {
      console.error('Erro na validação:', error);
      toast.error(`Erro na validação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setIsLoading(true);
      console.log('=== TESTE DE GERAÇÃO DE PDF ===');
      
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
      
      toast.success('PDF gerado e download iniciado!');
      
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(`Erro ao gerar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPDFInBrowser = async () => {
    try {
      setIsLoading(true);
      console.log('=== VISUALIZAR PDF NO NAVEGADOR ===');
      
      // Gerar o PDF
      const pdfBlob = await generateBudgetPDF(testBudgetData, testCompanyData);
      
      // Criar URL para visualização
      const url = URL.createObjectURL(pdfBlob);
      
      // Abrir em nova aba
      window.open(url, '_blank');
      
      // Limpar URL após um tempo
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);
      
      toast.success('PDF aberto em nova aba!');
      
    } catch (error) {
      console.error('Erro ao visualizar PDF:', error);
      toast.error(`Erro ao visualizar PDF: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Teste de Geração de PDF
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Botões de Teste */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={handleValidateCompanyData}
            disabled={isLoading}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Validar Dados
          </Button>
          
          <Button
            onClick={handleViewPDFInBrowser}
            disabled={isLoading}
            variant="outline"
          >
            <Eye className="h-4 w-4 mr-2" />
            Visualizar PDF
          </Button>
          
          <Button
            onClick={handleGeneratePDF}
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
        </div>

        {/* Dados de Teste */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold mb-2">Dados da Empresa (Teste)</h3>
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <div><strong>Nome:</strong> {testCompanyData.shop_name}</div>
              <div><strong>CNPJ:</strong> {testCompanyData.cnpj}</div>
              <div><strong>Telefone:</strong> {testCompanyData.contact_phone}</div>
              <div><strong>Email:</strong> {testCompanyData.email}</div>
              <div><strong>Endereço:</strong></div>
              <div className="ml-4 whitespace-pre-line">{testCompanyData.address}</div>
              <div><strong>Logo:</strong> {testCompanyData.logo_url}</div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Dados do Orçamento (Teste)</h3>
            <div className="bg-muted p-3 rounded text-sm space-y-1">
              <div><strong>Cliente:</strong> {testBudgetData.client_name}</div>
              <div><strong>Telefone:</strong> {testBudgetData.client_phone}</div>
              <div><strong>Dispositivo:</strong> {testBudgetData.device_type} - {testBudgetData.device_model}</div>
              <div><strong>Valor Total:</strong> R$ {testBudgetData.total_price.toFixed(2)}</div>
              <div><strong>Parcelas:</strong> {testBudgetData.installments}x R$ {testBudgetData.installment_price.toFixed(2)}</div>
              <div><strong>Garantia:</strong> {testBudgetData.warranty_months} meses</div>
              <div><strong>Qualidade:</strong> {testBudgetData.part_quality}</div>
            </div>
          </div>
        </div>

        {/* Resultados da Validação */}
        {testResults && (
          <div>
            <h3 className="font-semibold mb-2">Resultados da Validação</h3>
            <div className="bg-muted p-3 rounded text-sm">
              <div className="mb-2"><strong>Timestamp:</strong> {testResults.timestamp}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <strong>Dados Originais:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(testResults.original, null, 2)}
                  </pre>
                </div>
                <div>
                  <strong>Dados Validados:</strong>
                  <pre className="mt-1 text-xs overflow-auto">
                    {JSON.stringify(testResults.validated, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-2">Instruções de Teste</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>1. <strong>Validar Dados:</strong> Testa a função de validação e normalização dos dados da empresa</li>
            <li>2. <strong>Visualizar PDF:</strong> Abre o PDF em nova aba para verificar a formatação</li>
            <li>3. <strong>Baixar PDF:</strong> Faz download do PDF para análise detalhada</li>
            <li>4. <strong>Console:</strong> Verifique o console do navegador (F12) para logs detalhados</li>
            <li>5. <strong>Verificar:</strong> No PDF, confirme se endereço, CNPJ e logo estão corretos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default PDFTestComponent;