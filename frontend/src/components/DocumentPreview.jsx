import React from 'react';
import { FiPrinter, FiX } from 'react-icons/fi';
import './DocumentPreview.css';

/**
 * Componente para pré-visualização e impressão de documentos (receituários, laudos, etc)
 * @param {string} html - Conteúdo HTML do documento com placeholders
 * @param {string} css - Estilo CSS do documento
 * @param {object} dados - Objeto com os dados para substituir nos placeholders
 * @param {function} onClose - Função para fechar o preview
 */
const DocumentPreview = ({ html, css, dados, onClose }) => {
  
  // Função para processar placeholders no frontend (mesma lógica do backend para redundância)
  const processarTemplate = (templateHtml, info) => {
    let result = templateHtml;
    
    const placeholders = {
      '{{pet_nome}}': info.pet_nome || '',
      '{{pet_especie}}': info.pet_especie || '',
      '{{pet_raca}}': info.pet_raca || '',
      '{{pet_sexo}}': info.pet_sexo || '',
      '{{pet_nascimento}}': info.pet_nascimento || '',
      '{{pet_idade}}': info.pet_idade || '',
      '{{tutor_nome}}': info.tutor_nome || '',
      '{{tutor_celular}}': info.tutor_celular || '',
      '{{tutor_email}}': info.tutor_email || '',
      '{{data_emissao}}': info.data_emissao || new Date().toLocaleDateString('pt-BR'),
      '{{data_visita}}': info.data_visita || '',
      '{{medicamentos}}': info.medicamentos || '',
      '{{posologia}}': info.posologia || '',
      '{{observacoes}}': info.observacoes || '',
      '{{diagnostico}}': info.diagnostico || '',
      '{{tratamento}}': info.tratamento || '',
      '{{veterinario}}': info.veterinario || '',
      '{{crmv}}': info.crmv || '',
      '{{clinica_nome}}': info.clinica_nome || '',
      '{{clinica_endereco}}': info.clinica_endereco || '',
      '{{clinica_telefone}}': info.clinica_telefone || '',
      '{{clinica_email}}': info.clinica_email || '',
      '{{data_atual}}': new Date().toLocaleDateString('pt-BR'),
      '{{hora_atual}}': new Date().toLocaleTimeString('pt-BR')
    };
    
    Object.entries(placeholders).forEach(([key, val]) => {
      result = result.split(key).join(val);
    });
    
    return result;
  };

  const htmlFinal = processarTemplate(html, dados);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="doc-preview-overlay">
      <div className="doc-preview-container">
        <div className="doc-preview-header no-print">
          <h3>Pré-visualização do Documento</h3>
          <div className="header-actions">
            <button onClick={handlePrint} className="btn-print">
              <FiPrinter /> Imprimir
            </button>
            <button onClick={onClose} className="btn-close-preview">
              <FiX />
            </button>
          </div>
        </div>
        
        <div className="doc-content-wrapper">
          <style dangerouslySetInnerHTML={{ __html: css }} />
          <div 
            className="printable-document" 
            dangerouslySetInnerHTML={{ __html: htmlFinal }} 
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentPreview;
