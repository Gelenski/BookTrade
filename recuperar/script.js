document.querySelector('#recuperarform').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.querySelector('#email').value;
  const mensagem = document.querySelector('#mensagem');

  try {
    const response = await fetch('/recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    mensagem.textContent = data.message;
    mensagem.style.color = response.ok ? 'green' : 'red';
  } catch (error) {
    mensagem.textContent = 'Erro ao enviar solicitação.';
    mensagem.style.color = 'red';
  }
});
