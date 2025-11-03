document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#redefinirform");
  const novaSenhaInput = document.querySelector("#novasenha");
  const confirmarSenhaInput = document.querySelector("#confirmarsenha");
  const mensagem = document.querySelector("#mensagem");
  const botao = form?.querySelector("button[type='submit']");

  if (!form || !novaSenhaInput || !confirmarSenhaInput || !mensagem) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    // desabilita o botão ao clicar
    if (botao) {
      botao.disabled = true;
      botao.textContent = "Enviando..."; 
    }

    const novaSenha = novaSenhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    if (novaSenha !== confirmarSenha) {
      mensagem.textContent = "As senhas não coincidem.";
      mensagem.style.color = "red";
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Redefenir senha";
      }
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      mensagem.textContent = "Token inválido.";
      mensagem.style.color = "red";
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Redefenir senha";
      }
      return;
    }

    mensagem.textContent = "Redefinindo senha...";
    mensagem.style.color = "black";

    try {
      const response = await fetch("/api/auth/redefinir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, novaSenha }),
      });

      const data = await response.json();
      mensagem.textContent = data.message;
      mensagem.style.color = response.ok ? "green" : "red";
    } catch (error) {
      mensagem.textContent = "Erro ao redefinir senha: " + error.message;
      mensagem.style.color = "red";
    } finally {
      // reabilita o botão após a resposta
      if (botao) {
        botao.disabled = false;
        botao.textContent = "Enviar";
      }
    }
  });
});
