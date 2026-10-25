import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.ASAAS_API_KEY;
const API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';

const asaasApi = axios.create({
  baseURL: API_URL,
  headers: {
    'access_token': API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Cria um cliente no Asaas
 * @param {Object} data { name, cpfCnpj, email, postalCode, addressNumber }
 */
export async function criarCliente(data) {
  try {
    const response = await asaasApi.post('/customers', data);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar cliente Asaas:', JSON.stringify(error.response?.data, null, 2) || error.message);
    throw error;
  }
}

/**
 * Cria uma assinatura no Asaas
 * @param {String} customerId ID do cliente no Asaas
 * @param {Number} value Valor 
 * @param {String} billingType 'PIX' ou 'CREDIT_CARD'
 * @param {String} cycle 'MONTHLY', 'QUARTERLY', 'SEMIANNUALLY', 'YEARLY'
 * @param {Object} creditCard Dados do cartão { holderName, number, expiryMonth, expiryYear, ccv }
 * @param {Object} creditCardHolderInfo { name, email, cpfCnpj, postalCode, addressNumber, addressComplement, phone, mobilePhone }
 */
export async function criarAssinatura(customerId, value, billingType = 'PIX', cycle = 'MONTHLY', creditCard = null, creditCardHolderInfo = null) {
  try {
    const hoje = new Date();
    // Vencimento para hoje (caso pague agora) ou amanhã
    hoje.setDate(hoje.getDate() + 1);
    const dueDate = hoje.toISOString().split('T')[0];

    const payload = {
      customer: customerId,
      billingType: billingType,
      value: value,
      nextDueDate: dueDate,
      cycle: cycle,
      description: 'Assinatura Sistema OuroPet'
    };

    if (billingType === 'CREDIT_CARD' && creditCard && creditCardHolderInfo) {
      payload.creditCard = creditCard;
      payload.creditCardHolderInfo = creditCardHolderInfo;
    }

    const response = await asaasApi.post('/subscriptions', payload);
    return response.data;
  } catch (error) {
    console.error('Erro ao criar assinatura Asaas:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Pega o QRCode do Pix para uma cobrança específica gerada pela assinatura
 * @param {String} paymentId ID da cobrança (payment) não da assinatura
 */
export async function getPixQrCode(paymentId) {
  try {
    const response = await asaasApi.get(`/payments/${paymentId}/pixQrCode`);
    return response.data;
  } catch (error) {
    console.error('Erro ao buscar QRCode Pix:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Busca a primeira cobrança pendente de uma assinatura
 * @param {String} subscriptionId 
 */
export async function getPagamentoDaAssinatura(subscriptionId) {
  try {
    const response = await asaasApi.get(`/payments?subscription=${subscriptionId}&status=PENDING`);
    if (response.data.data.length > 0) {
      return response.data.data[0];
    }
    return null;
  } catch (error) {
    console.error('Erro ao buscar pagamento da assinatura:', error.response?.data || error.message);
    throw error;
  }
}
