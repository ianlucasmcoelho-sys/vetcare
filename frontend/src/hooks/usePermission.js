// frontend/src/hooks/usePermission.js
export const usePermission = () => {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  const perfil = usuario.perfil || "recepcionista";

  const isAdmin = () => perfil === "admin";
  const isVeterinario = () => perfil === "veterinario";
  const isRecepcionista = () => perfil === "recepcionista";

  const can = (acao) => {
    const permissoes = {
      admin: true,
      
      veterinario: {
        verDashboard: true,
        verResponsaveis: true,
        editarResponsaveis: false,
        verAnimais: true,
        editarAnimais: true,
        verAgenda: true,
        editarAgenda: true,
        verProntuarios: true,
        editarProntuarios: true,
        verVacinas: true,
        editarVacinas: true,
        verRetornos: true,
        editarRetornos: true,
        verEstoque: true,
        editarEstoque: false,
        verFinanceiro: true,
        editarFinanceiro: false,
        verReceituario: true,
        editarReceituario: true,      // ✅ Veterinário pode criar/editar receitas
        verUsuarios: false,
        editarUsuarios: false,
        verRelatorios: true,
        editarRelatorios: false,
        verConfiguracoes: true,        // ✅ Veterinário pode VER configurações
        editarConfiguracoes: false,    // ❌ NÃO pode editar
      },
      
      recepcionista: {
        verDashboard: true,
        verResponsaveis: true,
        editarResponsaveis: true,
        verAnimais: true,
        editarAnimais: true,
        verAgenda: true,
        editarAgenda: true,
        verProntuarios: true,
        editarProntuarios: false,
        verVacinas: true,
        editarVacinas: true,
        verRetornos: true,
        editarRetornos: true,
        verEstoque: true,
        editarEstoque: true,
        verFinanceiro: true,
        editarFinanceiro: true,
        verReceituario: true,
        editarReceituario: false,     // ❌ Recepcionista NÃO pode criar/editar receitas
        verUsuarios: false,
        editarUsuarios: false,
        verRelatorios: true,
        editarRelatorios: false,
        verConfiguracoes: true,        // ✅ Pode VER configurações
        editarConfiguracoes: false,    // ❌ NÃO pode editar
      }
    };

    if (isAdmin()) return true;
    if (perfil === "veterinario") return permissoes.veterinario[acao] || false;
    if (perfil === "recepcionista") return permissoes.recepcionista[acao] || false;
    return false;
  };

  return { perfil, isAdmin, isVeterinario, isRecepcionista, can };
};