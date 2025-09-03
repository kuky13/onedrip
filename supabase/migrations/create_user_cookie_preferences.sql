-- Criar tabela para preferências de cookies dos usuários
CREATE TABLE user_cookie_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    essential BOOLEAN DEFAULT true NOT NULL,
    functional BOOLEAN DEFAULT false NOT NULL,
    analytics BOOLEAN DEFAULT false NOT NULL,
    marketing BOOLEAN DEFAULT false NOT NULL,
    performance BOOLEAN DEFAULT false NOT NULL,
    social BOOLEAN DEFAULT false NOT NULL,
    granular JSONB DEFAULT '{}' NOT NULL,
    expiration_days INTEGER DEFAULT 365 NOT NULL,
    auto_cleanup BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(user_id)
);

-- Habilitar RLS
ALTER TABLE user_cookie_preferences ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados poderem ver e editar apenas suas próprias preferências
CREATE POLICY "Users can view their own cookie preferences" ON user_cookie_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cookie preferences" ON user_cookie_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cookie preferences" ON user_cookie_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cookie preferences" ON user_cookie_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_cookie_preferences_updated_at
    BEFORE UPDATE ON user_cookie_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Conceder permissões para roles anon e authenticated
GRANT SELECT, INSERT, UPDATE, DELETE ON user_cookie_preferences TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Índices para melhor performance
CREATE INDEX idx_user_cookie_preferences_user_id ON user_cookie_preferences(user_id);
CREATE INDEX idx_user_cookie_preferences_updated_at ON user_cookie_preferences(updated_at);