// ---------- LOGIN / CADASTRO ----------
document.getElementById?.('btnRegister')?.addEventListener('click', criarConta);
document.getElementById?.('btnLogin')?.addEventListener('click', fazerLogin);

document.getElementById?.('showRegister')?.addEventListener('click', ()=> {
  document.getElementById('loginBox').style.display='none';
  document.getElementById('registerBox').style.display='block';
});
document.getElementById?.('showLogin')?.addEventListener('click', ()=> {
  document.getElementById('registerBox').style.display='none';
  document.getElementById('loginBox').style.display='block';
});

function criarConta(){
  const u = document.getElementById('regUser').value?.trim();
  const p = document.getElementById('regPass').value?.trim();
  if(!u||!p){ alert('Preencha nome e senha'); return; }
  const users = JSON.parse(localStorage.getItem('users')||'{}');
  if(users[u]){ alert('Usuário já existe — escolha outro nome'); return; }
  users[u] = { password: p, repertorios: {} };
  localStorage.setItem('users', JSON.stringify(users));
  alert('Conta criada! Agora faça login.');
  document.getElementById('regUser').value='';
  document.getElementById('regPass').value='';
  document.getElementById('loginBox').style.display='block';
  document.getElementById('registerBox').style.display='none';
}

function fazerLogin(){
  const u = document.getElementById('loginUser')?.value?.trim();
  const p = document.getElementById('loginPass')?.value?.trim();
  if(!u||!p){ alert('Preencha nome e senha'); return; }
  const users = JSON.parse(localStorage.getItem('users')||'{}');
  if(!users[u]){ alert('Usuário não encontrado'); return; }
  if(users[u].password !== p){ alert('Senha incorreta'); return; }
  localStorage.setItem('loggedUser', u);
  location.href = 'leitor.html';
}

// ---------- ON APP LOAD (leitor.html) ----------
if(location.pathname.endsWith('leitor.html')){
  const user = localStorage.getItem('loggedUser');
  if(!user){ location.href='index.html'; } else {
    const welcome = document.getElementById('welcomeText');
    if(welcome) welcome.textContent = 'Seja bem-vindo, ' + user;
  }

  document.getElementById('btnLogout')?.addEventListener('click', ()=> {
    localStorage.removeItem('loggedUser'); location.href='index.html';
  });
  document.getElementById('btnNew')?.addEventListener('click', ()=> {
    document.getElementById('panelNew').style.display='block';
    document.getElementById('panelSaved').style.display='none';
  });
  document.getElementById('btnSaved')?.addEventListener('click', ()=> {
    document.getElementById('panelNew').style.display='none';
    document.getElementById('panelSaved').style.display='block';
  });

  document.getElementById('btnSaveSong')?.addEventListener('click', salvarMusica);
  document.getElementById('btnClearSong')?.addEventListener('click', ()=> {
    ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT'].forEach(id=>document.getElementById(id).value='');
  });
  document.getElementById('searchDate')?.addEventListener('change', carregarRepertorio);
  document.getElementById('btnShare')?.addEventListener('click', compartilharRepertorio);

  document.getElementById('panelNew').style.display='none';
  document.getElementById('panelSaved').style.display='block';
}

// ---------- FUNÇÕES ----------

function salvarMusica(){
  const user = localStorage.getItem('loggedUser');
  if(!user){ alert('Usuário não logado'); location.href='index.html'; return; }

  const data = document.getElementById('repDate').value; // yyyy-mm-dd
  const musica = document.getElementById('fieldMusic').value.trim();
  if(!data || !musica){ alert('Preencha data e nome da música'); return; }
  const tom = document.getElementById('fieldTom').value.trim();
  const ministro = document.getElementById('fieldMinister').value.trim();
  const letra = document.getElementById('fieldLyric').value.trim();
  const cifra = document.getElementById('fieldCifra').value.trim();
  const youtube = document.getElementById('fieldYT').value.trim();

  const db = JSON.parse(localStorage.getItem('repertorios')||'{}');
  if(!db[user]) db[user] = {};
  if(!db[user][data]) db[user][data] = [];

  db[user][data].push({ musica, tom, ministro, letra, cifra, youtube });
  localStorage.setItem('repertorios', JSON.stringify(db));

  alert('Música salva!');
  ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT'].forEach(id=>document.getElementById(id).value='');
  carregarRepertorio();
}

function carregarRepertorio(){
  const user = localStorage.getItem('loggedUser'); 
  if(!user){location.href='index.html'; return;}

  const data = document.getElementById('searchDate').value;
  const db = JSON.parse(localStorage.getItem('repertorios')||'{}');
  const container = document.getElementById('savedList');
  container.innerHTML = '';

  if(!db[user] || !db[user][data] || db[user][data].length===0){
    container.innerHTML = '<p>Nenhum repertório nessa data.</p>';
    return;
  }

  db[user][data].forEach((it, idx)=>{
    const div = document.createElement('div'); 
    div.className='musica-item';

    div.innerHTML = `
      <h3>${it.musica} <small>— Tom: ${it.tom} • ${it.ministro||''}</small></h3>
      <div class="link-buttons">
        <button class="btn letra" onclick="window.open('${it.letra}','_blank')">Letra</button>
        <button class="btn cifra" onclick="window.open('${it.cifra}','_blank')">Cifra</button>
        <button class="btn youtube" onclick="window.open('${it.youtube}','_blank')">YouTube</button>
        <button class="btn small" onclick="editarMusica(${idx})">Editar</button>
        <button class="btn small danger" onclick="excluirMusica(${idx})">Excluir</button>
      </div>`;
    container.appendChild(div);
  });
}

function editarMusica(idx){
  const user = localStorage.getItem('loggedUser');
  const data = document.getElementById('searchDate').value;
  const db = JSON.parse(localStorage.getItem('repertorios')||'{}');
  const song = db[user][data][idx];

  document.getElementById('repDate').value = data;
  document.getElementById('fieldMusic').value = song.musica;
  document.getElementById('fieldTom').value = song.tom;
  document.getElementById('fieldMinister').value = song.ministro;
  document.getElementById('fieldLyric').value = song.letra;
  document.getElementById('fieldCifra').value = song.cifra;
  document.getElementById('fieldYT').value = song.youtube;

  db[user][data].splice(idx,1);
  localStorage.setItem('repertorios', JSON.stringify(db));

  document.getElementById('panelNew').style.display='block';
  document.getElementById('panelSaved').style.display='none';
}

function excluirMusica(idx){
  if(!confirm('Deseja realmente excluir esta música?')) return;

  const user = localStorage.getItem('loggedUser');
  const data = document.getElementById('searchDate').value;
  const db = JSON.parse(localStorage.getItem('repertorios')||'{}');

  db[user][data].splice(idx,1);
  localStorage.setItem('repertorios', JSON.stringify(db));

  carregarRepertorio();
}

// ---------- CORREÇÃO DA DATA NO COMPARTILHAMENTO ----------
function formatarData(dataISO){
  // recebe 2025-12-07
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}-${mes}-${ano}`; // vira 07-12-2025
}

function compartilharRepertorio(){
  const user = localStorage.getItem('loggedUser'); 
  if(!user){ alert('Usuário não logado'); return;}

  const data = document.getElementById('searchDate').value; // yyyy-mm-dd
  const db = JSON.parse(localStorage.getItem('repertorios')||'{}');

  if(!db[user]||!db[user][data]||db[user][data].length===0){
    alert('Nada para compartilhar');
    return;
  }

  const encoded = encodeURIComponent(JSON.stringify(db[user][data]));

  // ---- AQUI ESTÁ A CORREÇÃO ----
  const dataFormatada = formatarData(data); // 07-12-2025

  const url = `${location.origin}/share.html?rep=${encoded}&title=LouvorIBI-${dataFormatada}`;

  navigator.clipboard.writeText(url).then(()=> alert('Link copiado!'));
}

// ==========================
// ESQUECI MINHA SENHA
// ==========================
document.getElementById('forgotPass')?.addEventListener('click', ()=>{
  const username = prompt("Digite seu nome de usuário para redefinir a senha:");
  if(!username) return alert("Nome de usuário obrigatório.");

  const users = JSON.parse(localStorage.getItem('users') || '{}');

  if(!users[username]) {
    alert("Usuário não encontrado.");
    return;
  }

  const newPass = prompt("Digite a nova senha:");
  if(!newPass) return alert("Senha não pode ser vazia.");

  users[username].password = newPass;
  localStorage.setItem('users', JSON.stringify(users));

  alert("Senha redefinida com sucesso! Agora você pode fazer login.");
});
