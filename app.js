// app.js - versão final integrada (use <script type="module" src="app.js"></script>)
// Imports Firebase via CDN (modular)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  arrayUnion
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/* ---------------------------
   CONFIG FIREBASE (SEU PROJETO)
   --------------------------- */
const firebaseConfig = {
  apiKey: "AIzaSyAcPkqOlLLqh2XVpkBj78absFAMLCkP8oU",
  authDomain: "devlouvor.firebaseapp.com",
  projectId: "devlouvor",
  storageBucket: "devlouvor.firebasestorage.app",
  messagingSenderId: "622416311876",
  appId: "1:622416311876:web:bd8b2f3ebdf435aa5c6e11"
};

/* ---------------------------
   Inicializa Firebase
   --------------------------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* ---------------------------
   Expor funções que podem ser chamadas por handlers dinâmicos
   --------------------------- */
window.editarMusica = editarMusica;
window.excluirMusica = excluirMusica;
window.compartilharRepertorio = compartilharRepertorio;

/* ---------------------------
   DOM ready
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Login / Register elements
  const loginUser = document.getElementById('loginUser');
  const loginPass = document.getElementById('loginPass');
  const regUser = document.getElementById('regUser');
  const regPass = document.getElementById('regPass');

  // Toggle boxes
  document.getElementById('showRegister')?.addEventListener('click', () => {
    document.getElementById('loginBox').style.display = 'none';
    document.getElementById('registerBox').style.display = 'block';
  });
  document.getElementById('showLogin')?.addEventListener('click', () => {
    document.getElementById('registerBox').style.display = 'none';
    document.getElementById('loginBox').style.display = 'block';
  });

  // Register
  document.getElementById('btnRegister')?.addEventListener('click', async () => {
    const email = regUser?.value.trim();
    const pass = regPass?.value.trim();
    if (!email || !pass) { alert('Preencha email e senha'); return; }
    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      alert('Conta criada! Faça login agora.');
      regUser.value = '';
      regPass.value = '';
      document.getElementById('loginBox').style.display = 'block';
      document.getElementById('registerBox').style.display = 'none';
    } catch (e) {
      alert('Erro ao criar conta: ' + e.message);
    }
  });

  // Login
  document.getElementById('btnLogin')?.addEventListener('click', async () => {
    const email = loginUser?.value.trim();
    const pass = loginPass?.value.trim();
    if (!email || !pass) { alert('Preencha email e senha'); return; }
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      // salvo uid/email para usar nos paths do Firestore
      localStorage.setItem('loggedUserUid', cred.user.uid);
      localStorage.setItem('loggedUserEmail', cred.user.email || email);
      location.href = 'leitor.html';
    } catch (e) {
      alert('Erro ao fazer login: ' + e.message);
    }
  });

  // Forgot password
  document.getElementById('forgotPass')?.addEventListener('click', async () => {
    const email = prompt("Digite seu email para redefinir a senha:");
    if (!email) return alert("Email obrigatório.");
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Email de redefinição enviado!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  });

  // Se estivermos na página do app (leitor.html)
  if (location.pathname.endsWith('leitor.html')) {
    document.getElementById('btnLogout')?.addEventListener('click', async () => {
      await signOut(auth);
      localStorage.removeItem('loggedUserUid');
      localStorage.removeItem('loggedUserEmail');
      location.href = 'index.html';
    });

    document.getElementById('btnNew')?.addEventListener('click', () => {
      document.getElementById('panelNew').style.display = 'block';
      document.getElementById('panelSaved').style.display = 'none';
    });

    document.getElementById('btnSaved')?.addEventListener('click', () => {
      document.getElementById('panelNew').style.display = 'none';
      document.getElementById('panelSaved').style.display = 'block';
    });

    document.getElementById('btnSaveSong')?.addEventListener('click', salvarMusica);
    document.getElementById('btnClearSong')?.addEventListener('click', () => {
      ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
    });

    document.getElementById('searchDate')?.addEventListener('change', carregarRepertorio);
    document.getElementById('btnShare')?.addEventListener('click', compartilharRepertorio);

    // estado inicial
    document.getElementById('panelNew').style.display = 'none';
    document.getElementById('panelSaved').style.display = 'block';
  }
});

/* ---------------------------
   Auth state
   --------------------------- */
onAuthStateChanged(auth, (user) => {
  if (user) {
    localStorage.setItem('loggedUserUid', user.uid);
    localStorage.setItem('loggedUserEmail', user.email || '');
    if (location.pathname.endsWith('leitor.html')) {
      const welcome = document.getElementById('welcomeText');
      if (welcome) welcome.textContent = 'Seja bem-vindo, ' + (user.email || user.uid);
      const sd = document.getElementById('searchDate')?.value;
      if (sd) carregarRepertorio();
    }
  } else {
    if (location.pathname.endsWith('leitor.html')) location.href = 'index.html';
  }
});

/* ---------------------------
   Helpers
   --------------------------- */
function getUserIdForPath() {
  return localStorage.getItem('loggedUserUid') || localStorage.getItem('loggedUserEmail') || null;
}

/* =========================
   CRUD de repertório
   ========================= */
async function salvarMusica() {
  const userId = getUserIdForPath();
  if (!userId) { alert('Usuário não logado'); location.href='index.html'; return; }

  const data = document.getElementById('repDate')?.value;
  const musica = document.getElementById('fieldMusic')?.value.trim();
  if (!data || !musica) { alert('Preencha data e música'); return; }

  const song = {
    musica,
    tom: document.getElementById('fieldTom')?.value.trim() || '',
    ministro: document.getElementById('fieldMinister')?.value.trim() || '',
    letra: document.getElementById('fieldLyric')?.value.trim() || '',
    cifra: document.getElementById('fieldCifra')?.value.trim() || '',
    youtube: document.getElementById('fieldYT')?.value.trim() || '',
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'users', userId, 'repertorios', data);
    await setDoc(docRef, { songs: arrayUnion(song) }, { merge: true });
    alert('Música salva!');
    ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    carregarRepertorio();
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
    console.error(e);
  }
}

async function carregarRepertorio() {
  const userId = getUserIdForPath();
  if (!userId) { location.href='index.html'; return; }

  const data = document.getElementById('searchDate')?.value;
  const container = document.getElementById('savedList');
  if (!container) return;
  container.innerHTML = '';

  if (!data) { container.innerHTML = '<p>Selecione uma data.</p>'; return; }

  try {
    const docRef = doc(db, 'users', userId, 'repertorios', data);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) { container.innerHTML = '<p>Nenhum repertório nessa data.</p>'; return; }

    const songs = docSnap.data().songs || [];
    if (!Array.isArray(songs) || songs.length === 0) {
      container.innerHTML = '<p>Nenhuma música salva nessa data.</p>';
      return;
    }

    songs.forEach((it, idx) => {
      const div = document.createElement('div');
      div.className = 'musica-item';
      const esc = s => (s || '').toString().replaceAll('<','&lt;').replaceAll('>','&gt;');

      const letraBtn = it.letra ? `<button class="btn letra" data-link="${esc(it.letra)}">Letra</button>` : '';
      const cifraBtn = it.cifra ? `<button class="btn cifra" data-link="${esc(it.cifra)}">Cifra</button>` : '';
      const ytBtn = it.youtube ? `<button class="btn youtube" data-link="${esc(it.youtube)}">YouTube</button>` : '';

      div.innerHTML = `
        <h3>${esc(it.musica)} <small>— Tom: ${esc(it.tom)} • ${esc(it.ministro||'')}</small></h3>
        <div class="link-buttons">
          ${letraBtn}
          ${cifraBtn}
          ${ytBtn}
          <button class="btn small" data-edit="${idx}">Editar</button>
          <button class="btn small danger" data-delete="${idx}">Excluir</button>
        </div>
      `;

      // listeners
      const letraButton = div.querySelector('button.letra');
      if (letraButton) letraButton.addEventListener('click', () => {
        const l = letraButton.dataset.link; if (l) window.open(l, '_blank'); else alert('Link de letra não disponível.');
      });
      const cifraButton = div.querySelector('button.cifra');
      if (cifraButton) cifraButton.addEventListener('click', () => {
        const l = cifraButton.dataset.link; if (l) window.open(l, '_blank'); else alert('Link de cifra não disponível.');
      });
      const ytButton = div.querySelector('button.youtube');
      if (ytButton) ytButton.addEventListener('click', () => {
        const l = ytButton.dataset.link; if (l) window.open(l, '_blank'); else alert('Link YouTube não disponível.');
      });

      const editBtn = div.querySelector('button[data-edit]');
      if (editBtn) editBtn.addEventListener('click', () => editarMusica(data, idx));
      const delBtn = div.querySelector('button[data-delete]');
      if (delBtn) delBtn.addEventListener('click', () => excluirMusica(data, idx));

      container.appendChild(div);
    });

  } catch (e) {
    container.innerHTML = '<p>Erro ao carregar repertório.</p>';
    console.error(e);
  }
}

async function editarMusica(data, idx) {
  const userId = getUserIdForPath();
  if (!userId) { location.href='index.html'; return; }

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return alert('Repertório não encontrado.');

  const songs = docSnap.data().songs || [];
  if (!Array.isArray(songs) || !songs[idx]) return alert('Música não encontrada.');

  const song = songs[idx];

  // preencher campos
  document.getElementById('repDate').value = data;
  document.getElementById('fieldMusic').value = song.musica || '';
  document.getElementById('fieldTom').value = song.tom || '';
  document.getElementById('fieldMinister').value = song.ministro || '';
  document.getElementById('fieldLyric').value = song.letra || '';
  document.getElementById('fieldCifra').value = song.cifra || '';
  document.getElementById('fieldYT').value = song.youtube || '';

  // remover a música antiga do array e salvar o novo array
  songs.splice(idx, 1);
  try {
    await setDoc(docRef, { songs }, { merge: true });
  } catch (e) {
    console.error('Erro ao atualizar repertório durante edição:', e);
  }

  // mostra painel para editar
  document.getElementById('panelNew').style.display = 'block';
  document.getElementById('panelSaved').style.display = 'none';
}

async function excluirMusica(data, idx) {
  if (!confirm('Deseja realmente excluir esta música?')) return;
  const userId = getUserIdForPath();
  if (!userId) { location.href='index.html'; return; }

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const songs = docSnap.data().songs || [];
  songs.splice(idx, 1);
  try {
    await setDoc(docRef, { songs }, { merge: true });
    carregarRepertorio();
  } catch (e) {
    alert('Erro ao excluir: ' + e.message);
  }
}

async function compartilharRepertorio() {
  const userId = getUserIdForPath();
  if (!userId) { alert('Usuário não logado'); return; }

  const data = document.getElementById('searchDate')?.value;
  if (!data) return alert('Selecione a data para compartilhar.');

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists() || (docSnap.data().songs||[]).length === 0) {
    alert('Nada para compartilhar');
    return;
  }

  try {
    const encoded = encodeURIComponent(JSON.stringify(docSnap.data().songs));
    const url = `${location.origin}/share.html?rep=${encoded}&title=LouvorIBI-${data}`;
    await navigator.clipboard.writeText(url);
    alert('Link copiado! Agora você pode compartilhar.');
  } catch (e) {
    alert('Erro ao gerar link: ' + e.message);
    console.error(e);
  }
}
