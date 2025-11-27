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
  arrayUnion,
  collection,
  addDoc,
  serverTimestamp
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
   Expor funções globais
   --------------------------- */
window.editarMusica = editarMusica;
window.excluirMusica = excluirMusica;
window.compartilharRepertorio = compartilharRepertorio;
window.toggleObsBox = toggleObsBox;
window.viewObservacoes = viewObservacoes;

/* ---------------------------
   DOM ready
   --------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  // Inputs login/register
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
    if (!email || !pass) return alert('Preencha email e senha');

    try {
      await createUserWithEmailAndPassword(auth, email, pass);
      alert('Conta criada! Faça login.');
      regUser.value = '';
      regPass.value = '';
      document.getElementById('registerBox').style.display = 'none';
      document.getElementById('loginBox').style.display = 'block';
    } catch (e) {
      alert('Erro ao criar conta: ' + e.message);
    }
  });

  // Login
  document.getElementById('btnLogin')?.addEventListener('click', async () => {
    const email = loginUser?.value.trim();
    const pass = loginPass?.value.trim();
    if (!email || !pass) return alert('Preencha email e senha');

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
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
      alert("Email enviado!");
    } catch (e) {
      alert("Erro: " + e.message);
    }
  });

  // Página do app (leitor.html)
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
      ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT']
        .forEach(id => document.getElementById(id).value = '');
    });

    document.getElementById('searchDate')?.addEventListener('change', carregarRepertorio);

    document.getElementById('btnShare')?.addEventListener('click', compartilharRepertorio);

    // Toggle obs button (exists in leitor.html UI)
    document.getElementById('btnToggleObs')?.addEventListener('click', toggleObsBox);

    document.getElementById('panelNew').style.display = 'none';
    document.getElementById('panelSaved').style.display = 'block';

    // Ensure the repDate change also loads possible observations when changing date while in New panel
    document.getElementById('repDate')?.addEventListener('change', async () => {
      const d = document.getElementById('repDate').value;
      if (!d) return;
      // load existing observations (if any)
      const userId = getUserIdForPath();
      if (!userId) return;
      const docRef = doc(db, 'users', userId, 'repertorios', d);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const obs = docSnap.data().observacoes || '';
        document.getElementById('fieldObs').value = obs;
      } else {
        document.getElementById('fieldObs').value = '';
      }
    });
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
      carregarRepertorio();
    }
  } else {
    if (location.pathname.endsWith('leitor.html')) location.href = 'index.html';
  }
});

/* ---------------------------
   Helpers
   --------------------------- */
function getUserIdForPath() {
  return localStorage.getItem('loggedUserUid') ||
         localStorage.getItem('loggedUserEmail') ||
         null;
}

/* =========================
   CRUD de repertório
   ========================= */
async function salvarMusica() {
  const userId = getUserIdForPath();
  if (!userId) return location.href = 'index.html';

  // Validação: todos os campos obrigatórios
  const data = document.getElementById('repDate')?.value;
  const musica = document.getElementById('fieldMusic')?.value.trim();
  const tom = document.getElementById('fieldTom')?.value.trim();
  const ministro = document.getElementById('fieldMinister')?.value.trim();
  const letra = document.getElementById('fieldLyric')?.value.trim();
  const cifra = document.getElementById('fieldCifra')?.value.trim();
  const youtube = document.getElementById('fieldYT')?.value.trim();
  const observacoes = document.getElementById('fieldObs')?.value.trim() || '';

  if (!data) return alert('Preencha a data.');
  if (!musica) return alert('Preencha o nome da música.');
  if (!tom) return alert('Preencha o tom.');
  if (!ministro) return alert('Preencha o ministro(a).');
  if (!letra) return alert('Preencha o link da letra.');
  if (!cifra) return alert('Preencha o link da cifra.');
  if (!youtube) return alert('Preencha o link do YouTube.');

  const song = {
    musica,
    tom,
    ministro,
    letra,
    cifra,
    youtube,
    createdAt: new Date().toISOString()
  };

  try {
    const docRef = doc(db, 'users', userId, 'repertorios', data);
    // salva song com arrayUnion e também salva observações no mesmo doc
    await setDoc(docRef, { songs: arrayUnion(song), observacoes }, { merge: true });
    alert('Música salva!');
    ['fieldMusic','fieldTom','fieldMinister','fieldLyric','fieldCifra','fieldYT']
      .forEach(id => document.getElementById(id).value = '');
    carregarRepertorio();
  } catch (e) {
    alert('Erro ao salvar: ' + e.message);
  }
}

async function carregarRepertorio() {
  const userId = getUserIdForPath();
  if (!userId) return location.href = 'index.html';

  const data = document.getElementById('searchDate')?.value;
  const container = document.getElementById('savedList');
  if (!container) return;

  container.innerHTML = '';

  if (!data) return container.innerHTML = '<p>Selecione uma data.</p>';

  try {
    const docRef = doc(db, 'users', userId, 'repertorios', data);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) return container.innerHTML = '<p>Nenhum repertório nesta data.</p>';

    const songs = docSnap.data().songs || [];
    const observacoes = docSnap.data().observacoes || '';

    if (songs.length === 0) return container.innerHTML = '<p>Nenhuma música salva.</p>';

    // If there are observations, show a top button to view them
    if (observacoes) {
      const obsBtn = document.createElement('button');
      obsBtn.className = 'btn small';
      obsBtn.textContent = 'Observações';
      obsBtn.addEventListener('click', () => viewObservacoes(observacoes));
      container.appendChild(obsBtn);
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

      div.querySelector('.letra')?.addEventListener('click', e => window.open(e.target.dataset.link, '_blank'));
      div.querySelector('.cifra')?.addEventListener('click', e => window.open(e.target.dataset.link, '_blank'));
      div.querySelector('.youtube')?.addEventListener('click', e => window.open(e.target.dataset.link, '_blank'));

      div.querySelector('[data-edit]')?.addEventListener('click', () => editarMusica(data, idx));
      div.querySelector('[data-delete]')?.addEventListener('click', () => excluirMusica(data, idx));

      container.appendChild(div);
    });

  } catch (e) {
    console.error(e);
    container.innerHTML = '<p>Erro ao carregar repertório.</p>';
  }
}

async function editarMusica(data, idx) {
  const userId = getUserIdForPath();
  if (!userId) return location.href = 'index.html';

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return alert('Repertório não encontrado.');

  const songs = docSnap.data().songs || [];
  const song = songs[idx];
  if (!song) return alert('Música não encontrada.');

  document.getElementById('repDate').value = data;
  document.getElementById('fieldMusic').value = song.musica;
  document.getElementById('fieldTom').value = song.tom;
  document.getElementById('fieldMinister').value = song.ministro;
  document.getElementById('fieldLyric').value = song.letra;
  document.getElementById('fieldCifra').value = song.cifra;
  document.getElementById('fieldYT').value = song.youtube;

  // load observations into textarea (if exist)
  const observacoes = docSnap.data().observacoes || '';
  document.getElementById('fieldObs').value = observacoes;

  // remove the edited song from array and update
  songs.splice(idx, 1);
  await setDoc(docRef, { songs }, { merge: true });

  document.getElementById('panelNew').style.display = 'block';
  document.getElementById('panelSaved').style.display = 'none';
}

async function excluirMusica(data, idx) {
  if (!confirm('Deseja excluir esta música?')) return;

  const userId = getUserIdForPath();
  if (!userId) return location.href = 'index.html';

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return;

  const songs = docSnap.data().songs || [];
  songs.splice(idx, 1);
  await setDoc(docRef, { songs }, { merge: true });

  carregarRepertorio();
}

/* =========================
   Observações (UI helper)
   ========================= */
function toggleObsBox() {
  const box = document.getElementById('obsBox');
  if (!box) return;
  box.style.display = (box.style.display === 'block') ? 'none' : 'block';
}

function viewObservacoes(text) {
  // show a modal-like box using prompt-like UI (but nicer)
  const wrapper = document.createElement('div');
  wrapper.className = 'obs-modal-backdrop';
  wrapper.innerHTML = `
    <div class="obs-modal">
      <h3>Observações</h3>
      <div class="obs-content"></div>
      <button class="btn small close-obs">Fechar</button>
    </div>
  `;
  document.body.appendChild(wrapper);
  wrapper.querySelector('.obs-content').textContent = text || '(Sem observações)';
  wrapper.querySelector('.close-obs').addEventListener('click', () => wrapper.remove());
}

/* =========================
   Função FINAL corrigida — COMPARTILHAR
   ========================= */
async function compartilharRepertorio() {
  const userId = getUserIdForPath();
  if (!userId) return alert('Usuário não logado');

  const data = document.getElementById('searchDate')?.value;
  if (!data) return alert('Selecione uma data');

  const docRef = doc(db, 'users', userId, 'repertorios', data);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists() || (docSnap.data().songs || []).length === 0) {
    return alert('Nada para compartilhar.');
  }

  try {
    const songs = docSnap.data().songs;
    const observacoes = docSnap.data().observacoes || '';

    // Gera um id curto para compartilhar (ex: base36)
    const shortId = Math.random().toString(36).substring(2, 9);

    // Salva na coleção 'shared' um documento curto
    const sharedRef = doc(db, 'shared', shortId);
    await setDoc(sharedRef, {
      owner: userId,
      songs,
      observacoes,
      title: `Louvor&Adoração - ${data}`,
      createdAt: serverTimestamp()
    });

    const url = `${location.origin}/share.html?id=${shortId}`;
    await navigator.clipboard.writeText(url);
    alert('Link curto copiado!\nCole e compartilhe: ' + url);

  } catch (e) {
    alert('Erro ao gerar link: ' + e.message);
  }
}
