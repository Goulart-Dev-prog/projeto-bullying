// ── EMAILJS CONFIG ──
const EJS_SERVICE  = "service_bullying";
const EJS_TEMPLATE = "template_0lyi1sn";
const EMAIL_DEST   = "2meprojetobullying@gmail.com";

// ── USUÁRIOS ──
const USERS = {
  'daniela':           { senha: 'Daniela@mg.gov.br',  label: 'Daniela' },
  'tatiely':           { senha: 'Tatiely@mg.gov.br',  label: 'Tatiely' },
  'adm':               { senha: '@glj1522',             label: 'Administrador' }

};

// ── FIREBASE CONFIG ──
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, onValue, update, remove } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";

const firebaseConfig = {
  apiKey:            "AIzaSyAWvDVqIQcVjp0tyZfLhealG2F3F7oq1yo",
  authDomain:        "projeto-bullying.firebaseapp.com",
  databaseURL:       "https://projeto-bullying-default-rtdb.firebaseio.com",
  projectId:         "projeto-bullying",
  storageBucket:     "projeto-bullying.firebasestorage.app",
  messagingSenderId: "1045186929878",
  appId:             "1:1045186929878:web:a7ec84f65041c06d351577"
};

const app        = initializeApp(firebaseConfig);
const db         = getDatabase(app);
const reportsRef = ref(db, 'denuncias');
const trashRef   = ref(db, 'lixeira');

// ── STATE ──
let adminUnlocked = false;
let currentUser   = null;
let currentRole   = null;
let reports       = [];
let trashItems    = [];
let chartTypes    = null;
let chartLocals   = null;

// ── FIREBASE LISTENERS ──
onValue(reportsRef, (snapshot) => {
  reports = [];
  snapshot.forEach((child) => {
    reports.push({ firebaseKey: child.key, ...child.val() });
  });
  reports.reverse();
  if (adminUnlocked) renderAdmin();
});

onValue(trashRef, (snapshot) => {
  trashItems = [];
  snapshot.forEach((child) => {
    trashItems.push({ firebaseKey: child.key, ...child.val() });
  });
  trashItems.reverse();
  if (adminUnlocked) renderTrash();
});

// ── NAVIGATION ──
window.showPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.getElementById('tab-' + page).classList.add('active');
  if (page === 'admin') renderAdmin();
};

window.tryAdmin = function() {
  if (adminUnlocked) { window.showPage('admin'); return; }
  document.getElementById('login-overlay').style.display = 'flex';
  document.getElementById('user-input').value = '';
  document.getElementById('pw-input').value   = '';
  document.getElementById('pw-error').style.display = 'none';
  setTimeout(() => document.getElementById('user-input').focus(), 80);
};

window.cancelLogin = function() {
  document.getElementById('login-overlay').style.display = 'none';
};

window.checkPw = function() {
  const rawU = document.getElementById('user-input').value.trim();
  const u    = rawU.toLowerCase();
  const pw   = document.getElementById('pw-input').value;
  const matchKey = Object.keys(USERS).find(k => k === rawU || k === u);
  if (matchKey && USERS[matchKey].senha === pw) {
    adminUnlocked = true;
    currentUser   = matchKey;
    document.getElementById('login-overlay').style.display = 'none';
    window.showPage('admin');
  } else {
    document.getElementById('pw-error').style.display = 'block';
    document.getElementById('pw-input').value = '';
    document.getElementById('pw-input').focus();
  }
};

window.logoutAdmin = function() {
  adminUnlocked = false;
  currentUser   = null;
  window.showPage('form');
};

window.switchTab = function(tab) {
  ['active','archive','trash'].forEach(t => {
    document.getElementById('atab-' + t).classList.toggle('active', t === tab);
    document.getElementById('panel-' + t).style.display = t === tab ? 'block' : 'none';
  });
};

// ── FORM ──
window.selectRole = function(role) {
  currentRole = role;
  document.getElementById('role-victim').classList.toggle('selected', role === 'victim');
  document.getElementById('role-witness').classList.toggle('selected', role === 'witness');
};

window.toggleTag = function(el) { el.classList.toggle('on'); };

window.submitReport = async function() {
  if (!currentRole) { toast('Selecione se você é vítima ou testemunha ↑', 'info'); return; }
  const desc = document.getElementById('description').value.trim();
  if (!desc) { toast('Descreva o que aconteceu ↑', 'info'); return; }

  const now  = new Date();
  const tags = Array.from(document.querySelectorAll('.tag.on')).map(t => t.textContent);
  const report = {
    role:      currentRole,
    types:     tags.length ? tags : ['Não especificado'],
    local:     document.getElementById('local').value   || 'Não informado',
    turma:     document.getElementById('turma').value   || '',
    desc,
    contact:   document.getElementById('contact').value.trim(),
    date:      now.toLocaleDateString('pt-BR'),
    time:      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now(),
    status:    'Nova',
  };

  const btn = document.getElementById('submit-btn');
  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  try {
    await push(reportsRef, report);
    document.getElementById('form-content').style.display   = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('msg-victim').style.display  = currentRole === 'victim'  ? 'block' : 'none';
    document.getElementById('msg-witness').style.display = currentRole === 'witness' ? 'block' : 'none';
  } catch(e) {
    toast('Erro ao enviar. Verifique sua conexão.', 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Enviar denúncia com segurança';
  }
};

window.resetForm = function() {
  currentRole = null;
  ['role-victim','role-witness'].forEach(id => document.getElementById(id).classList.remove('selected'));
  document.querySelectorAll('.tag').forEach(t => t.classList.remove('on'));
  ['local','turma','description','contact'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('form-content').style.display   = 'block';
  document.getElementById('success-screen').style.display = 'none';
};

// ── ADMIN RENDER ──
function renderAdmin() {
  const now    = new Date();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const active   = reports.filter(r => r.status !== 'Resolvida');
  const archived = reports.filter(r => r.status === 'Resolvida');

  document.getElementById('admin-sub').textContent =
    `${months[now.getMonth()]} ${now.getFullYear()} · ${reports.length} denúncia${reports.length !== 1 ? 's' : ''} no total · Logado como: ${USERS[currentUser]?.label}`;

  document.getElementById('st-total').textContent     = reports.length;
  document.getElementById('st-victims').textContent   = reports.filter(r => r.role === 'victim').length;
  document.getElementById('st-witnesses').textContent = reports.filter(r => r.role === 'witness').length;
  document.getElementById('st-resolved').textContent  = archived.length;

  document.getElementById('cnt-active').textContent        = active.length;
  document.getElementById('cnt-active-label').textContent  = active.length;
  document.getElementById('cnt-archive').textContent       = archived.length;
  document.getElementById('cnt-archive-label').textContent = archived.length;

  buildCharts(active);
  renderList(active,   'list-active',  false);
  renderList(archived, 'list-archive', true);
  renderTrash();
}

function renderList(items, listId, isArchive) {
  const el = document.getElementById(listId);
  if (!items.length) {
    el.innerHTML = `<div class="loading-wrap" style="color:var(--gray-text)">${isArchive ? 'Nenhuma denúncia arquivada ainda.' : 'Nenhuma denúncia ativa no momento.'}</div>`;
    return;
  }
  el.innerHTML = items.map(r => {
    const urgent      = !isArchive && r.status === 'Nova' && r.types && r.types.some(t => /físic|ameaç/i.test(t));
    const badgeCls    = r.status === 'Nova' ? 'new' : r.status === 'Em análise' ? 'pending' : 'done';
    const roleLabel   = r.role === 'victim' ? '👤 Vítima' : '👁 Testemunha';
    const turmaInfo   = r.turma   ? ` · 🏫 <strong>${r.turma}</strong>` : '';
    const timeInfo    = r.time    ? ` às ${r.time}` : '';
    const contactInfo = r.contact ? `<br>📞 ${r.contact}` : '';
    const typesStr    = (r.types || []).join(', ');

    const controls = isArchive
      ? `<button class="small-btn amber" onclick="unarchiveReport('${r.firebaseKey}')">↩ Reativar</button>
         <button class="small-btn red"   onclick="moveToTrash('${r.firebaseKey}')">🗑 Apagar</button>`
      : `<select onchange="updateStatus('${r.firebaseKey}', this.value)" style="font-size:11px;border:1px solid var(--gray-border);border-radius:6px;padding:3px 6px;color:var(--text);font-family:inherit;cursor:pointer">
           <option ${r.status==='Nova'?'selected':''}>Nova</option>
           <option ${r.status==='Em análise'?'selected':''}>Em análise</option>
           <option ${r.status==='Resolvida'?'selected':''}>Resolvida</option>
         </select>
         <button class="small-btn red" onclick="moveToTrash('${r.firebaseKey}')">🗑 Apagar</button>`;

    return `<div class="report-item ${urgent ? 'urgent' : ''} ${isArchive ? 'archived' : ''}">
      <div>
        <div class="r-type">${roleLabel} · ${typesStr}</div>
        <div class="r-desc">${r.desc}</div>
        <div class="r-meta">📍 ${r.local}${turmaInfo} · 📅 ${r.date}${timeInfo}${contactInfo}</div>
      </div>
      <div class="r-right">
        <span class="badge ${badgeCls}">${r.status}</span>
        ${controls}
      </div>
    </div>`;
  }).join('');
}

function renderTrash() {
  document.getElementById('cnt-trash').textContent       = trashItems.length;
  document.getElementById('cnt-trash-label').textContent = trashItems.length;
  const el = document.getElementById('list-trash');
  if (!trashItems.length) {
    el.innerHTML = '<div class="loading-wrap" style="color:var(--gray-text)">A lixeira está vazia.</div>';
    return;
  }
  el.innerHTML = trashItems.map(r => {
    const roleLabel  = r.role === 'victim' ? '👤 Vítima' : '👁 Testemunha';
    const turmaInfo  = r.turma ? ` · 🏫 <strong>${r.turma}</strong>` : '';
    const timeInfo   = r.time  ? ` às ${r.time}` : '';
    const whoLabel   = USERS[r.deletedBy]?.label || r.deletedBy || 'Desconhecido';
    return `<div class="report-item trashed">
      <div>
        <div class="r-type">${roleLabel} · ${(r.types||[]).join(', ')}</div>
        <div class="r-desc">${r.desc}</div>
        <div class="r-meta">📍 ${r.local}${turmaInfo} · 📅 ${r.date}${timeInfo}</div>
        <div class="deleted-by">🗑 Apagado por <strong>${whoLabel}</strong> em ${r.deletedAt}</div>
      </div>
      <div class="r-right">
        <span class="badge trash">Lixeira</span>
        <button class="small-btn green" onclick="restoreFromTrash('${r.firebaseKey}')">↩ Restaurar</button>
        <button class="small-btn red"   onclick="deletePermanently('${r.firebaseKey}')">❌ Excluir</button>
      </div>
    </div>`;
  }).join('');
}

// ── ACTIONS ──
window.updateStatus = async function(key, newStatus) {
  try {
    await update(ref(db, 'denuncias/' + key), { status: newStatus });
    if (newStatus === 'Resolvida') toast('✅ Denúncia arquivada!', 'ok');
  } catch(e) { toast('Erro ao atualizar status.', 'err'); }
};

window.unarchiveReport = async function(key) {
  try {
    await update(ref(db, 'denuncias/' + key), { status: 'Em análise' });
    toast('Denúncia reativada.', 'ok');
  } catch(e) { toast('Erro ao reativar.', 'err'); }
};

window.moveToTrash = async function(key) {
  if (!confirm('Mover para a lixeira? Poderá ser restaurada depois.')) return;
  const report = reports.find(r => r.firebaseKey === key);
  if (!report) return;
  const now = new Date();
  try {
    const entry = {
      ...report,
      deletedBy:        currentUser,
      deletedAt:        `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      deletedTimestamp: Date.now(),
    };
    delete entry.firebaseKey;
    await push(trashRef, entry);
    await remove(ref(db, 'denuncias/' + key));
    toast('🗑 Movido para a lixeira.', 'info');
  } catch(e) { toast('Erro ao mover para lixeira.', 'err'); }
};

window.restoreFromTrash = async function(key) {
  const item = trashItems.find(r => r.firebaseKey === key);
  if (!item) return;
  try {
    const restored = { ...item, status: 'Em análise' };
    delete restored.firebaseKey;
    delete restored.deletedBy;
    delete restored.deletedAt;
    delete restored.deletedTimestamp;
    await push(reportsRef, restored);
    await remove(ref(db, 'lixeira/' + key));
    toast('✅ Denúncia restaurada!', 'ok');
  } catch(e) { toast('Erro ao restaurar.', 'err'); }
};

window.deletePermanently = async function(key) {
  if (!confirm('Excluir permanentemente? Não pode ser desfeito.')) return;
  try {
    await remove(ref(db, 'lixeira/' + key));
    toast('Excluída permanentemente.', 'info');
  } catch(e) { toast('Erro ao excluir.', 'err'); }
};

window.emptyTrash = async function() {
  if (!trashItems.length) { toast('Lixeira já está vazia.', 'info'); return; }
  if (!confirm(`Excluir permanentemente TODAS as ${trashItems.length} denúncias da lixeira? Não pode ser desfeito.`)) return;
  try {
    await remove(trashRef);
    toast('Lixeira esvaziada.', 'info');
  } catch(e) { toast('Erro ao esvaziar.', 'err'); }
};

// ── CHARTS ──
function buildCharts(active) {
  const tc = {}, lc = {};
  active.forEach(r => {
    (r.types || []).forEach(t => { tc[t] = (tc[t] || 0) + 1; });
    const l = (r.local || '').split('/')[0].trim();
    lc[l] = (lc[l] || 0) + 1;
  });
  const pal = ['#0D2B5E','#1a3f80','#3b82f6','#60a5fa','#93c5fd','#bfdbfe','#dbeafe'];
  if (chartTypes)  chartTypes.destroy();
  if (chartLocals) chartLocals.destroy();
  chartTypes = new Chart(document.getElementById('chart-types'), {
    type: 'doughnut',
    data: { labels: Object.keys(tc), datasets: [{ data: Object.values(tc), backgroundColor: pal, borderWidth: 0 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11, family: 'Inter' }, boxWidth: 12, padding: 8 } } } }
  });
  chartLocals = new Chart(document.getElementById('chart-locals'), {
    type: 'bar',
    data: { labels: Object.keys(lc), datasets: [{ data: Object.values(lc), backgroundColor: '#0D2B5E', borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#5a6a84', stepSize: 1 } },
        y: { grid: { display: false }, ticks: { font: { size: 11, family: 'Inter' }, color: '#5a6a84' } }
      }
    }
  });
}

// ── RELATÓRIO EMAIL ──
window.sendMonthlyReport = async function() {
  const btn = document.getElementById('btn-report');
  btn.disabled    = true;
  btn.textContent = 'Enviando...';

  const now    = new Date();
  const months = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const mes    = `${months[now.getMonth()]} ${now.getFullYear()}`;
  const active   = reports.filter(r => r.status !== 'Resolvida');
  const archived = reports.filter(r => r.status === 'Resolvida');

  let linhas = '';
  reports.forEach((r, i) => {
    linhas += `\n-----------------------------\n#${i+1} | ${r.role === 'victim' ? 'Vítima' : 'Testemunha'} | ${r.status}\nData: ${r.date}${r.time ? ' às ' + r.time : ''}\nTipo: ${(r.types||[]).join(', ')}\nLocal: ${r.local}\nTurma: ${r.turma || 'Não informada'}\nDescrição: ${r.desc}\nContato: ${r.contact || 'Anônimo'}`;
  });

  const mensagem =
`RELATÓRIO MENSAL — FALE. NÓS ESCUTAMOS.
Escola Estadual Dr. Farid Silva
Período: ${mes}
Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}

RESUMO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total de denúncias: ${reports.length}
Vítimas diretas:    ${reports.filter(r=>r.role==='victim').length}
Testemunhas:        ${reports.filter(r=>r.role==='witness').length}
Denúncias ativas:   ${active.length}
Arquivadas:         ${archived.length}

DENÚNCIAS DETALHADAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${linhas || '\n\nNenhuma denúncia registrada.'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Relatório gerado pelo sistema Fale. Nós Escutamos.`;

  try {
    await window.emailjs.send(EJS_SERVICE, EJS_TEMPLATE, {
      to_email:  EMAIL_DEST,
      name:      'Coordenação Fale. Nós Escutamos.',
      email:     EMAIL_DEST,
      from_name: 'Sistema Fale. Nós Escutamos.',
      subject:   `Relatório Mensal — Fale. Nós Escutamos. (${mes})`,
      message:   mensagem,
    });
    toast(`✅ Relatório de ${mes} enviado para ${EMAIL_DEST}!`, 'ok');
  } catch(err) {
    console.error('EmailJS erro:', err);
    toast(`❌ Erro ao enviar: ${err.text || err.message || 'verifique o console'}`, 'err');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:15px;height:15px;stroke:#fff;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> Enviar relatório';
  }
};

// ── CSV ──
window.exportCSV = function() {
  const header = 'Papel,Tipos,Local,Turma,Descrição,Contato,Data,Horário,Status\n';
  const rows = reports.map(r =>
    `"${r.role==='victim'?'Vítima':'Testemunha'}","${(r.types||[]).join('; ')}","${r.local}","${r.turma||'Não informada'}","${(r.desc||'').replace(/"/g,"'")}","${r.contact||'Anônimo'}","${r.date}","${r.time||'—'}","${r.status}"`
  ).join('\n');
  const blob = new Blob(['\uFEFF'+header+rows], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url;
  a.download = `denuncias_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.csv`;
  a.click(); URL.revokeObjectURL(url);
};

// ── TOAST ──
let toastTimer;
window.toast = function(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className   = `toast ${type}`;
  el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = 'none'; }, 4000);
};
