
-- Função somente-leitura para verificar status da licença sem atualizar a tabela
CREATE OR REPLACE FUNCTION public.get_user_license_status(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO 'public'
AS $$
DECLARE
  license_record RECORD;
  result JSONB;
  debug_info JSONB;
  v_now timestamptz := NOW();
  v_has_user BOOLEAN := false;
  v_has_any_license BOOLEAN := false;
  v_requires_activation BOOLEAN := false;
  v_requires_renewal BOOLEAN := false;
  v_is_valid BOOLEAN := false;
  v_message TEXT := 'Status desconhecido';
BEGIN
  -- Info básica para debug
  debug_info := jsonb_build_object(
    'user_id', p_user_id,
    'timestamp', v_now
  );

  -- Verificar existência do usuário (usa SECURITY DEFINER)
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_has_user;

  IF NOT v_has_user THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Usuário não encontrado',
      'timestamp', v_now
    );
  END IF;

  -- Buscar a licença mais recente do usuário (ativa ou não), sem alterar nada
  SELECT l.*
  INTO license_record
  FROM public.licenses l
  WHERE l.user_id = p_user_id
  ORDER BY l.activated_at DESC NULLS LAST, l.created_at DESC
  LIMIT 1;

  v_has_any_license := license_record IS NOT NULL;

  IF NOT v_has_any_license THEN
    RETURN jsonb_build_object(
      'has_license', false,
      'is_valid', false,
      'message', 'Nenhuma licença encontrada',
      'requires_activation', false,
      'requires_renewal', false,
      'timestamp', v_now
    );
  END IF;

  -- Calcular condições de expiração/ativação
  IF license_record.expires_at IS NOT NULL AND license_record.expires_at < v_now THEN
    -- Expirada
    v_is_valid := false;
    v_requires_renewal := true;
    v_message := 'Licença expirada';
  ELSIF NOT license_record.is_active THEN
    -- Existe licença, porém desativada
    v_is_valid := false;
    v_requires_activation := true;
    v_message := 'Licença desativada';
  ELSE
    -- Ativa e não expirada
    v_is_valid := true;
    v_message := 'Licença ativa';
  END IF;

  RETURN jsonb_build_object(
    'has_license', true,
    'is_valid', v_is_valid,
    'license_code', license_record.code,
    'expires_at', license_record.expires_at,
    'activated_at', license_record.activated_at,
    'days_remaining', CASE 
      WHEN license_record.expires_at IS NULL THEN NULL
      ELSE GREATEST(0, EXTRACT(DAY FROM (license_record.expires_at - v_now))::INT)
    END,
    'message', v_message,
    'requires_activation', v_requires_activation,
    'requires_renewal', v_requires_renewal,
    'expired_at', CASE 
      WHEN v_requires_renewal THEN license_record.expires_at 
      ELSE NULL 
    END,
    'timestamp', v_now
  );
END;
$$;

-- Permitir execução para usuários autenticados
GRANT EXECUTE ON FUNCTION public.get_user_license_status(uuid) TO authenticated;
