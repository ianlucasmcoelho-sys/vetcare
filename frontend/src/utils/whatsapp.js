export const criarLinkWhatsAppWeb = (telefone, mensagem = '') => {
  const digits = String(telefone || '').replace(/\D/g, '');
  if (!digits) return null;

  const hasBrazilCountryCode = digits.startsWith('55') && (digits.length === 12 || digits.length === 13);
  const phone = hasBrazilCountryCode ? digits : `55${digits}`;
  const params = new URLSearchParams({ phone, text: mensagem });
  return `https://web.whatsapp.com/send?${params.toString()}`;
};

export const abrirWhatsAppWeb = (telefone, mensagem = '') => {
  const url = criarLinkWhatsAppWeb(telefone, mensagem);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
};
