export interface PixTransaction {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  qr_code?: string;
  qr_code_base64?: string;
  mercado_pago_id?: string;
  external_reference?: string;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  user_id: string;
  plan_type: string;
}

export interface PixPaymentRequest {
  amount: number;
  description: string;
  external_reference?: string;
  notification_url?: string;
}

export interface PixPaymentResponse {
  id: string;
  status: string;
  qr_code: string;
  qr_code_base64: string;
  external_reference?: string;
}