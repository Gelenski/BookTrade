// Selecionar elementos do formulário
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const messageDiv = document.getElementById("message");
const toggleSenha = document.getElementById("toggleSenha");
const password = document.getElementById("password")

// * Verifica se já está autenticado ao carregar a página
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const response = await fetch("/api/auth/verificar-sessao", {
      method: "GET",
      credentials: "include",
    });
    const data = await response.json();

    if (data.success && data.autenticado) {
      // Já está autenticado, redireciona para a página apropriada
      const rotas = {
        admin: "/admin/index.html",
        revisor: "/revisor/index.html",
        comum: "/user/index.html",
      };
      window.location.href = rotas[data.usuario.tipo] || "/user/index.html";
    }
  } catch (error) {
    console.error("Erro ao verificar sessão:", error);
  }
});

// Event listener para o submit do formulário
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Limpar mensagem anterior
  messageDiv.textContent = "";
  messageDiv.className = "";

  // Pegar valores dos inputs
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  // Validação básica no frontend
  if (!email || !password) {
    showMessage("Por favor, preencha todos os campos", "error");
    return;
  }

  // Desabilitar botão durante o envio
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Entrando...";

  try {
    // Fazer requisição para a API
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });

    const data = await response.json();

    if (data.success) {
      // Login bem-sucedido
      showMessage(data.message, "success");

      let url;

      switch (data.user.tipo) {
        case "admin":
          url = "/admin/index.html";
          break;
        case "revisor":
          url = "/revisor/index.html";
          break;
        case "comum":
          url = "/user/index.html";
          break;
      }

      setTimeout(() => {
        window.location.href = url; // endereço da página após login
      }, 500);
    } else {
      // Login falhou
      showMessage(data.message, "error");
    }
  } catch (error) {
    console.error("Erro:", error);
    showMessage("Erro ao conectar com o servidor", "error");
  } finally {
    // Reabilitar botão
    submitBtn.disabled = false;
    submitBtn.textContent = "Entrar";
  }
});
//mostar senha 
toggleSenha.addEventListener("change", () => {
  password.type = toggleSenha.checked ? "text" : "password";
});

// Função para exibir mensagens
function showMessage(message, type) {
  messageDiv.textContent = message;
  messageDiv.className = `message ${type}`;
  messageDiv.style.display = "block";
}
