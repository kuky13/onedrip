// WhatsApp utility functions
interface Budget {
  title?: string;
  description?: string;
  total?: number;
  [key: string]: unknown;
}

export const generateWhatsAppMessage = (budgetOrTitle: Budget | string, description?: string, price?: number): string => {
  if (typeof budgetOrTitle === 'string') {
    // Legacy usage with title, description, price
    let message = `*${budgetOrTitle}*`;
    
    if (description) {
      message += `\n\n${description}`;
    }
    
    if (price) {
      message += `\n\n*Valor:* R$ ${price.toFixed(2)}`;
    }
    
    return encodeURIComponent(message);
  }

  // New usage with budget object
  const budget = budgetOrTitle;
  let message = `● *Criado em:* ${new Date(budget.created_at).toLocaleDateString('pt-BR')}\n`;
  
  if (budget.valid_until || budget.expires_at) {
    const validDate = budget.valid_until || budget.expires_at;
    message += `● *Válido até:* ${new Date(validDate).toLocaleDateString('pt-BR')}\n`;
  }
  
  message += `\n*Aparelho:* ${budget.device_model || 'Não informado'}\n`;
  message += `*Qualidade da peça:* ${budget.part_quality || budget.piece_quality || 'Original'}\n`;
  
  message += `\n💰 *VALORES*\n`;
  
  const cashPrice = budget.cash_price || budget.total_price;
  if (cashPrice) {
    const price = typeof cashPrice === 'number' ? (cashPrice > 1000 ? cashPrice / 100 : cashPrice) : parseFloat(cashPrice);
    message += `• *Total:* R$ ${price.toFixed(2).replace('.', ',')}\n`;
  }
  
  const installmentPrice = budget.installment_price;
  const installments = budget.installments || budget.installment_count;
  if (installmentPrice && installments && installments > 1) {
    const price = typeof installmentPrice === 'number' ? (installmentPrice > 1000 ? installmentPrice / 100 : installmentPrice) : parseFloat(installmentPrice);
    message += `• *Parcelado:* R$ ${price.toFixed(2).replace('.', ',')} em até ${installments}x no cartão\n`;
  }
  
  if (budget.warranty_months) {
    message += `\n✅️ *Garantia:* ${budget.warranty_months} meses\n`;
    message += `🚫 *Não cobre danos por água ou quedas*\n`;
  }
  
  // Adicionar serviços inclusos apenas se existirem
  const services = [];
  if (budget.includes_delivery) {
    services.push('▪︎ Busca e entrega');
  }
  if (budget.includes_screen_protector) {
    services.push('▪︎ Película 3D de brinde');
  }
  
  if (services.length > 0) {
    message += `\n📦 *Serviços inclusos:*\n`;
    message += services.join('\n');
  }
  
  return message;
};

export const shareViaWhatsApp = (url: string, text?: string): void => {
  const message = text ? `${text}\n\n${url}` : url;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
};

export const openWhatsApp = (phone?: string, message?: string): void => {
  let whatsappUrl = 'https://wa.me/';
  
  if (phone) {
    // Remove any non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    whatsappUrl += cleanPhone;
  }
  
  if (message) {
    whatsappUrl += `?text=${encodeURIComponent(message)}`;
  }
  
  window.open(whatsappUrl, '_blank');
};