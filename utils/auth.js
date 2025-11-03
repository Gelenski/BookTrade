async function verificarSessao() {
  try {
    const response = await fetch("/api/verificar-sessao", {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (data.success && data.autenticado) {
      return data.usuario;
    }
    return null;
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
    return null;
  }
}

export default { verificarSessao };
