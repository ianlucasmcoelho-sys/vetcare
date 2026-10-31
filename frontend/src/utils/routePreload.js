import { lazy } from "react";

const loaders = {
  Login: () => import("../pages/Login.jsx"),
  Inicio: () => import("../pages/Inicio.jsx"),
  Dashboard: () => import("../pages/Dashboard.jsx"),
  Responsaveis: () => import("../pages/Responsaveis.jsx"),
  Animais: () => import("../pages/Animais.jsx"),
  Historico: () => import("../pages/Historico.jsx"),
  Retornos: () => import("../pages/Retornos.jsx"),
  Agenda: () => import("../pages/Agenda.jsx"),
  Vacinas: () => import("../pages/Vacinas.jsx"),
  Estoque: () => import("../pages/Estoque.jsx"),
  Financeiro: () => import("../pages/Financeiro.jsx"),
  Documentos: () => import("../pages/Documentos.jsx"),
  Retencao: () => import("../pages/Retencao.jsx"),
  CentralArquivos: () => import("../pages/CentralArquivos.jsx"),
  PerfilTutor: () => import("../pages/PerfilTutor.jsx"),
  PerfilAnimal: () => import("../pages/PerfilAnimal.jsx"),
  Receituario: () => import("../pages/Receituario.jsx"),
  Relatorios: () => import("../pages/Relatorios.jsx"),
  Configuracoes: () => import("../pages/Configuracoes.jsx"),
  MeuPerfil: () => import("../pages/MeuPerfil.jsx"),
  CadastroClinica: () => import("../pages/CadastroClinica.jsx"),
  ResetarSenha: () => import("../pages/ResetarSenha.jsx"),
  RecuperarSenha: () => import("../pages/RecuperarSenha.jsx"),
  Usuarios: () => import("../pages/Usuarios.jsx"),
  Internacao: () => import("../pages/Internacao.jsx"),
  Exames: () => import("../pages/Exames.jsx"),
  TemplateManager: () => import("../pages/TemplateManager.jsx"),
  TabelaPrecos: () => import("../pages/TabelaPrecos.jsx"),
  Landing: () => import("../pages/Landing.jsx"),
  Orcamentos: () => import("../pages/Orcamentos.jsx"),
  Planos: () => import("../pages/Planos.jsx"),
  Checkout: () => import("../pages/Checkout.jsx"),
  PagamentoSucesso: () => import("../pages/PagamentoSucesso.jsx"),
  Onboarding: () => import("../pages/Onboarding.jsx"),
  Comissoes: () => import("../pages/Comissoes.jsx"),
  BanhoTosa: () => import("../pages/BanhoTosa.jsx"),
  AcompanharBanhoTosa: () => import("../pages/AcompanharBanhoTosa.jsx"),
  Automacoes: () => import("../pages/Automacoes.jsx"),
  Assinatura: () => import("../pages/Assinatura.jsx"),
  NotasFiscais: () => import("../pages/NotasFiscais.jsx"),
};
const pending = new Map();
const load = (name) => {
  if (!pending.has(name)) {
    pending.set(name, loaders[name]().catch(error => { pending.delete(name); throw error; }));
  }
  return pending.get(name);
};
export const lazyPage = name => lazy(() => load(name));
const routes = {
  "/": "Inicio",
  "/dashboard": "Dashboard",
  "/login": "Login",
  "/cadastro": "CadastroClinica",
  "/recuperar-senha": "RecuperarSenha",
  "/resetar-senha": "ResetarSenha",
  "/planos": "Planos",
  "/checkout": "Checkout",
  "/pagamento-sucesso": "PagamentoSucesso",
  "/onboarding": "Onboarding",
  "/responsaveis": "Responsaveis",
  "/animais": "Animais",
  "/historico": "Historico",
  "/retornos": "Retornos",
  "/agenda": "Agenda",
  "/vacinas": "Vacinas",
  "/tabela-precos": "TabelaPrecos",
  "/receituario": "Receituario",
  "/financeiro": "Financeiro",
  "/documentos": "Documentos",
  "/arquivos": "CentralArquivos",
  "/assinatura": "Assinatura",
  "/configuracoes": "Configuracoes",
  "/perfil": "MeuPerfil",
  "/usuarios": "Usuarios",
  "/templates": "TemplateManager",
  "/orcamentos": "Orcamentos",
  "/notas-fiscais": "NotasFiscais",
  "/internacao": "Internacao",
  "/exames": "Exames",
  "/estoque": "Estoque",
  "/servicos": "Estoque",
  "/comissoes": "Comissoes",
  "/crm": "Retencao",
  "/relatorios": "Relatorios",
};
export function preloadRoute(path) {
  const name = routes[path];
  if (name) void load(name).catch(() => {});
}
