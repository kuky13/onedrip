# Implementação de IDs Sequenciais para Ordens de Serviço

## 1. Análise da Estrutura Atual

### 1.1 Estrutura do Banco de Dados

Atualmente, a tabela `service_orders` possui:
- **Chave primária**: `id` (UUID)
- **Campo de exibição**: `formatted_id` (gerado dinamicamente)
- **Formato atual**: `'OS-' || UPPER(SUBSTRING(so.id::text FROM 1 FOR 8))`

### 1.2 Componentes que Exibem IDs

| Componente | Localização | Uso do formatted_id |
|------------|-------------|--------------------|
| ServiceOrderPublicShare.tsx | Título da página | `<h1>{serviceOrder.formatted_id}</h1>` |
| EnhancedSharePage.tsx | Título da página | `{serviceOrder.formatted_id}` |
| Funções RPC | get_service_order_by_share_token | Retorna formatted_id |
| WhatsApp Integration | Mensagens | Referência ao número da OS |

### 1.3 Geração Atual do formatted_id

O `formatted_id` é gerado dinamicamente nas consultas SQL:
```sql
('OS-' || UPPER(SUBSTRING(so.id::text FROM 1 FOR 8))) as formatted_id
```

## 2. Arquitetura da Solução

### 2.1 Nova Estrutura de Dados

#### Tabela de Controle de Sequência
```sql
CREATE TABLE service_order_sequence (
  id SERIAL PRIMARY KEY,
  current_number INTEGER NOT NULL DEFAULT 0,
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Modificação na Tabela service_orders
```sql
ALTER TABLE service_orders 
ADD COLUMN sequential_number INTEGER;

CREATE UNIQUE INDEX idx_service_orders_sequential_number 
ON service_orders(sequential_number) 
WHERE sequential_number IS NOT NULL;
```

### 2.2 Função de Geração de Número Sequencial

```sql
CREATE OR REPLACE FUNCTION generate_sequential_number()
RETURNS INTEGER AS $$
DECLARE
  v_current_number INTEGER;
  v_new_number INTEGER;
BEGIN
  -- Lock para evitar concorrência
  LOCK TABLE service_order_sequence IN EXCLUSIVE MODE;
  
  -- Obter número atual
  SELECT current_number INTO v_current_number 
  FROM service_order_sequence 
  WHERE id = 1;
  
  -- Se não existe registro, criar
  IF v_current_number IS NULL THEN
    INSERT INTO service_order_sequence (current_number) VALUES (0);
    v_current_number := 0;
  END IF;
  
  -- Incrementar número
  v_new_number := v_current_number + 1;
  
  -- Reset após 9999
  IF v_new_number > 9999 THEN
    v_new_number := 1;
    UPDATE service_order_sequence 
    SET current_number = v_new_number, 
        last_reset_at = NOW(),
        updated_at = NOW()
    WHERE id = 1;
  ELSE
    UPDATE service_order_sequence 
    SET current_number = v_new_number,
        updated_at = NOW()
    WHERE id = 1;
  END IF;
  
  RETURN v_new_number;
END;
$$ LANGUAGE plpgsql;
```

### 2.3 Trigger para Auto-geração

```sql
CREATE OR REPLACE FUNCTION assign_sequential_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Atribuir número sequencial apenas para novos registros
  IF NEW.sequential_number IS NULL THEN
    NEW.sequential_number := generate_sequential_number();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_assign_sequential_number
  BEFORE INSERT ON service_orders
  FOR EACH ROW
  EXECUTE FUNCTION assign_sequential_number();
```

## 3. Estratégia de Migração

### 3.1 Migração de Dados Existentes

```sql
-- Passo 1: Criar estruturas
-- (Executar scripts da seção 2.1 e 2.2)

-- Passo 2: Atribuir números sequenciais aos registros existentes
WITH numbered_orders AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (ORDER BY created_at) as seq_num
  FROM service_orders 
  WHERE deleted_at IS NULL
    AND sequential_number IS NULL
)
UPDATE service_orders 
SET sequential_number = numbered_orders.seq_num
FROM numbered_orders
WHERE service_orders.id = numbered_orders.id;

-- Passo 3: Atualizar contador de sequência
UPDATE service_order_sequence 
SET current_number = (
  SELECT COALESCE(MAX(sequential_number), 0) 
  FROM service_orders
)
WHERE id = 1;
```

### 3.2 Função de Formatação

```sql
CREATE OR REPLACE FUNCTION format_service_order_id(seq_number INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN 'OS: ' || LPAD(seq_number::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## 4. Atualização de Funções RPC

### 4.1 Atualizar get_service_order_by_share_token

```sql
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  device_type varchar,
  device_model varchar,
  reported_issue text,
  status varchar,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  -- Validação do token (mantida)
  IF NOT EXISTS (
    SELECT 1 FROM service_order_shares 
    WHERE share_token = p_share_token 
    AND is_active = true 
    AND expires_at > now()
  ) THEN
    RAISE EXCEPTION 'Invalid or expired share token';
  END IF;

  -- Retornar dados com novo formato
  RETURN QUERY
  SELECT 
    so.id,
    format_service_order_id(so.sequential_number) as formatted_id,
    so.device_type,
    so.device_model,
    so.reported_issue,
    so.status::varchar,
    so.created_at,
    so.updated_at
  FROM service_orders so
  JOIN service_order_shares sos ON so.id = sos.service_order_id
  WHERE sos.share_token = p_share_token
    AND sos.is_active = true
    AND sos.expires_at > now()
    AND so.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

### 4.2 Atualizar get_service_order_details

```sql
CREATE OR REPLACE FUNCTION public.get_service_order_details(p_service_order_id uuid)
RETURNS TABLE(
  id uuid,
  formatted_id text,
  -- outros campos...
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    so.id,
    format_service_order_id(so.sequential_number) as formatted_id,
    -- outros campos...
  FROM service_orders so
  WHERE so.id = p_service_order_id
    AND so.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Atualização dos Componentes Frontend

### 5.1 Tipos TypeScript

Os tipos já estão corretos, mantendo `formatted_id: string` nas interfaces.

### 5.2 Componentes Afetados

Nenhuma alteração necessária nos componentes React, pois eles já consomem o `formatted_id` das funções RPC.

## 6. Plano de Testes

### 6.1 Testes de Unidade

```sql
-- Teste 1: Geração de números sequenciais
SELECT generate_sequential_number(); -- Deve retornar 1
SELECT generate_sequential_number(); -- Deve retornar 2

-- Teste 2: Reset após 9999
UPDATE service_order_sequence SET current_number = 9999;
SELECT generate_sequential_number(); -- Deve retornar 1

-- Teste 3: Formatação
SELECT format_service_order_id(1);    -- 'OS: 0001'
SELECT format_service_order_id(9999); -- 'OS: 9999'
```

### 6.2 Testes de Integração

1. **Criação de nova ordem**: Verificar se o número sequencial é atribuído automaticamente
2. **Exibição em componentes**: Verificar se o novo formato aparece corretamente
3. **Compartilhamento**: Verificar se as URLs de compartilhamento funcionam
4. **WhatsApp**: Verificar se as mensagens usam o novo formato

### 6.3 Testes de Concorrência

```sql
-- Simular inserções simultâneas
BEGIN;
  INSERT INTO service_orders (owner_id, device_type, device_model, reported_issue) 
  VALUES (auth.uid(), 'Smartphone', 'iPhone 12', 'Tela quebrada');
COMMIT;
```

## 7. Considerações de Performance

### 7.1 Índices

```sql
-- Índice para busca por número sequencial
CREATE INDEX idx_service_orders_sequential_number 
ON service_orders(sequential_number);

-- Índice composto para consultas frequentes
CREATE INDEX idx_service_orders_owner_sequential 
ON service_orders(owner_id, sequential_number);
```

### 7.2 Monitoramento

```sql
-- View para monitorar uso da sequência
CREATE VIEW v_sequence_status AS
SELECT 
  current_number,
  last_reset_at,
  (9999 - current_number) as remaining_numbers,
  CASE 
    WHEN current_number > 9000 THEN 'ALERT'
    WHEN current_number > 8000 THEN 'WARNING'
    ELSE 'OK'
  END as status
FROM service_order_sequence
WHERE id = 1;
```

## 8. Plano de Implementação

### Fase 1: Preparação (1 dia)
1. Criar tabela de sequência
2. Adicionar coluna sequential_number
3. Criar funções auxiliares

### Fase 2: Migração (1 dia)
1. Executar migração de dados existentes
2. Criar triggers
3. Atualizar funções RPC

### Fase 3: Testes (2 dias)
1. Testes de unidade
2. Testes de integração
3. Testes de performance

### Fase 4: Deploy (1 dia)
1. Deploy em ambiente de produção
2. Monitoramento pós-deploy
3. Validação final

## 9. Rollback Plan

Em caso de problemas:

```sql
-- Reverter para formato anterior
CREATE OR REPLACE FUNCTION public.get_service_order_by_share_token(p_share_token text)
-- ... usar formato anterior: ('OS-' || UPPER(SUBSTRING(so.id::text FROM 1 FOR 8)))

-- Remover trigger se necessário
DROP TRIGGER IF EXISTS trigger_assign_sequential_number ON service_orders;
```

## 10. Benefícios da Implementação

1. **IDs mais amigáveis**: Números sequenciais são mais fáceis de comunicar
2. **Controle de volume**: Fácil identificação da quantidade de ordens
3. **Compatibilidade**: Mantém UUIDs como chaves primárias
4. **Flexibilidade**: Sistema pode ser facilmente ajustado
5. **Auditoria**: Histórico completo mantido com ambos os identificadores

## 11. Considerações de Segurança

1. **RLS mantido**: Políticas de Row Level Security permanecem inalteradas
2. **Acesso controlado**: Funções usam SECURITY DEFINER
3. **Validação**: Tokens de compartilhamento continuam validados
4. **Logs**: Manter logs de alterações na sequência