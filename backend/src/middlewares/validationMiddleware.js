import { z } from 'zod';

// Middleware de validação genérico
export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    return res.status(400).json({
      error: 'Erro de validação',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }))
    });
  }
};

// --- Schemas Específicos ---

// Login
export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('E-mail inválido'),
    senha: z.string().min(6, 'A senha deve ter pelo menos 6 caracteres'),
  })
});

// Animal
export const animalSchema = z.object({
  body: z.object({
    nome: z.string().min(1, 'Nome é obrigatório'),
    especie: z.string().min(1, 'Espécie é obrigatória'),
    raca: z.string().optional(),
    sexo: z.enum(['M', 'F', 'Macho', 'Fêmea']).optional(),
    nascimento: z.string().optional(),
    responsavel_id: z.number().positive('Responsável é obrigatório'),
  })
});

// Financeiro
export const financeiroSchema = z.object({
  body: z.object({
    descricao: z.string().min(1, 'Descrição é obrigatória'),
    valor: z.coerce.number().positive('Valor deve ser positivo'),
    tipo: z.enum(['entrada', 'saida']),
    data: z.string().min(1, 'Data é obrigatória'),
    categoria: z.string().optional(),
    metodo_pagamento: z.string().optional(),
    observacoes: z.string().optional(),
  })
});

// Estoque (Movimentação)
export const estoqueMovimentacaoSchema = z.object({
  body: z.object({
    produto_id: z.number().positive('Produto é obrigatório'),
    tipo: z.enum(['entrada', 'saida']),
    quantidade: z.coerce.number().positive('Quantidade deve ser positiva'),
    motivo: z.string().optional(),
  })
});
