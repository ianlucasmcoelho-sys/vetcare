import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authMiddleware } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Inicializar o SDK do Gemini
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey);

router.post("/prontuario", authMiddleware, async (req, res) => {
  try {
    const { textoBruto } = req.body;

    if (!textoBruto) {
      return res.status(400).json({ error: "Texto bruto não fornecido." });
    }

    if (!apiKey) {
      return res.status(500).json({ error: "Chave da API do Gemini não configurada no servidor." });
    }

    // Configurar o modelo moderno (gemini-1.5-flash com JSON estrito nativo)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      generationConfig: {
        responseMimeType: "application/json"
      }
    });

    const prompt = `
    Você é um assistente veterinário experiente. O veterinário acabou de ditar as anotações de uma consulta e você precisa estruturar esse relato em campos específicos de um prontuário médico.
    
    Relato ditado: "${textoBruto}"
    
    Retorne um objeto JSON com a seguinte estrutura:
    {
      "sintomas": "Resumo dos sintomas ou queixa principal (ou string vazia se não mencionado)",
      "diagnostico": "Diagnóstico ou suspeita clínica (ou string vazia se não mencionado)",
      "tratamento": "Tratamento realizado na clínica ou conduta médica (ou string vazia se não mencionado)",
      "prescricoes": "Receituário para casa, medicamentos, doses (ou string vazia se não mencionado)",
      "observacoes": "Quaisquer outras informações relevantes (ou string vazia se não mencionado)"
    }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let structuredData;
    try {
      structuredData = JSON.parse(responseText.trim());
    } catch (parseError) {
      const cleanResponse = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      structuredData = JSON.parse(cleanResponse);
    }

    return res.json(structuredData);

  } catch (error) {
    console.error("Erro no processamento de IA:", error);
    return res.status(500).json({ error: "Erro ao processar o áudio com a Inteligência Artificial." });
  }
});

export default router;
