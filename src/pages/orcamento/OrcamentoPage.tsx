import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { OrcamentoListPage } from './OrcamentoListPage';
import { OrcamentoFormPage } from './OrcamentoFormPage';
import { OrcamentoDetailPage } from './OrcamentoDetailPage';

/**
 * Página principal de orçamentos com roteamento interno
 * Gerencia as sub-rotas: lista, novo, visualizar e editar
 */
export const OrcamentoPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        {/* Rota principal - Lista de orçamentos */}
        <Route index element={<OrcamentoListPage />} />
        
        {/* Criar novo orçamento */}
        <Route path="novo" element={<OrcamentoFormPage />} />
        
        {/* Visualizar orçamento específico */}
        <Route path=":id" element={<OrcamentoDetailPage />} />
        
        {/* Editar orçamento específico */}
        <Route path=":id/editar" element={<OrcamentoFormPage />} />
      </Routes>
    </div>
  );
};