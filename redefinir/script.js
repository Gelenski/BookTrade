document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#redefinirform'); // minúsculo
  const novaSenhaInput = document.querySelector('#novasenha'); // minúsculo
  const confirmarSenhaInput = document.querySelector('#confirmarsenha'); // minúsculo
  const mensagem = document.querySelector('#mensagem');

  if (!form || !novaSenhaInput || !confirmarSenhaInput || !mensagem) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const novaSenha = novaSenhaInput.value;
    const confirmarSenha = confirmarSenhaInput.value;

    if (novaSenha !== confirmarSenha) {
      mensagem.textContent = 'As senhas não coincidem.';
      mensagem.style.color = 'red';
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      mensagem.textContent = 'Token inválido.';
      mensagem.style.color = 'red';
      return;
    }

    mensagem.textContent = 'Redefinindo senha...';
    mensagem.style.color = 'black';

    try {
      const response = await fetch('/redefinir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha })
      });

      const data = await response.json();
      mensagem.textContent = data.message;
      mensagem.style.color = response.ok ? 'green' : 'red';
    } catch (error) {
      mensagem.textContent = 'Erro ao redefinir senha.';
      mensagem.style.color = 'red';
    }
  });
});

