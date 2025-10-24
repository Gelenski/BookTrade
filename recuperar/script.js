document
  .querySelector("#recuperarform")
  .addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.querySelector("#email").value;
    const mensagem = document.querySelector("#mensagem");

    try {
      const response = await fetch("/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        credentials: "include",
      });
      if (response.status === 401 || response.status === 403) {
        alert("Sessão expirada ou sem permissão. Faça login novamente.");
        window.location.href = "/login/index.html";
        return;
      }
      const data = await response.json();
      mensagem.textContent = data.message;
      mensagem.style.color = response.ok ? "green" : "red";
    } catch (error) {
      mensagem.textContent = "Erro ao enviar solicitação: " + error.message;
      mensagem.style.color = "red";
    }
  });
