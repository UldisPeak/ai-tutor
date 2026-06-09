/* =========================================================
   AI Tutors — frontend loģika
   ========================================================= */

let activeConv = null;       // aktīvās sarunas ID
let conversations = [];      // sarunu saraksts
let materials = [];          // materiālu saraksts
let selectedFile = null;     // izvēlētais PDF augšupielādei
let sending = false;

const $ = id => document.getElementById(id);

/* ---------- HTML escaping (drošība) ---------- */
function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
/* Minimāls formatējums: **trekns**, *slīps*, `kods`, jaunās rindas */
function fmt(s) {
    return esc(s)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/`(.+?)`/g, '<code>$1</code>')
        .replace(/(^|[^*])\*(?!\*)(.+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/\n/g, '<br>');
}

/* =========================================================
   STARTĒŠANA
   ========================================================= */
async function boot() {
    await loadConversations();
    await loadMaterials();
}

/* ---------- Sarunu saraksts ---------- */
async function loadConversations() {
    const res = await fetch('/api/conversations');
    conversations = await res.json();
    renderConvList();
}

function renderConvList() {
    const list = $('convList');
    list.querySelectorAll('.conv-item').forEach(e => e.remove());
    const empty = $('convEmpty');

    if (!conversations.length) { empty.style.display = 'block'; return; }
    empty.style.display = 'none';

    conversations.forEach(c => {
        const item = document.createElement('div');
        item.className = 'conv-item' + (c.id === activeConv ? ' active' : '');
        item.dataset.id = c.id;
        const meta = c.material_title ? esc(c.material_title) : 'Vispārīga saruna';
        item.innerHTML = `
            <div class="conv-title">${esc(c.title || 'Jauna saruna')}</div>
            <div class="conv-meta">${meta}</div>
            <button class="conv-del" title="Dzēst">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>`;
        item.addEventListener('click', e => {
            if (e.target.closest('.conv-del')) return;
            openConversation(c.id);
        });
        item.querySelector('.conv-del').addEventListener('click', e => {
            e.stopPropagation();
            deleteConversation(c.id);
        });
        list.appendChild(item);
    });
}

/* ---------- Materiālu saraksts ---------- */
async function loadMaterials() {
    const res = await fetch('/api/materials');
    materials = await res.json();
    renderMaterialGrid();
}

function renderMaterialGrid() {
    const grid = $('materialGrid');
    grid.innerHTML = '';
    if (!materials.length) {
        grid.innerHTML = '<div style="color:var(--ink-faint);font-size:14px;text-align:center;padding:8px 0">Vēl nav neviena materiāla. Augšupielādē pirmo!</div>';
        return;
    }
    materials.forEach(m => {
        const card = document.createElement('div');
        card.className = 'material-card';
        const badge = m.is_public
            ? `<span class="badge">Kopīgs${m.owner ? ' · ' + esc(m.owner) : ''}</span>`
            : `<span class="badge mine">Mans</span>`;
        card.innerHTML = `
            <div class="mc-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <div class="mc-body">
                <div class="mc-title">${esc(m.title)}</div>
                <div class="mc-sub">${m.subject ? esc(m.subject) : 'Bez priekšmeta'}</div>
            </div>
            ${badge}`;
        card.addEventListener('click', () => startConversation(m.id));
        grid.appendChild(card);
    });
}

/* =========================================================
   SARUNAS
   ========================================================= */
async function startConversation(materialId) {
    const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ material_id: materialId })
    });
    const data = await res.json();
    if (data.error) { alert(data.error); return; }

    closeModal();
    await loadConversations();
    activeConv = data.conversation_id;
    renderConvList();
    showChat();

    // sākuma sveiciens
    const mat = materials.find(m => m.id === materialId);
    setHeader(mat);
    $('messagesInner').innerHTML = '';
    const greeting = mat
        ? `Sveiks! Strādāsim ar materiālu **${mat.title}**. Ko vēlies saprast? Vari uzdot jautājumu vai lūgt, lai izskaidroju kādu tēmu.`
        : `Sveiks! Esmu tavs mācību asistents. Par kuru tēmu vēlies runāt? Es palīdzēšu tev to saprast soli pa solim.`;
    addMessage('assistant', greeting);
    $('msgInput').focus();
}

async function openConversation(id) {
    activeConv = id;
    renderConvList();
    showChat();
    closeSidebarMobile();

    const conv = conversations.find(c => c.id === id);
    setHeader(conv && conv.material_title ? { title: conv.material_title, subject: conv.subject } : null);

    $('messagesInner').innerHTML = '';
    const res = await fetch('/api/conversations/' + id);
    const data = await res.json();
    if (data.messages) {
        data.messages.forEach(m => addMessage(m.role, m.content, false));
        scrollDown();
    }
    $('msgInput').focus();
}

async function deleteConversation(id) {
    if (!confirm('Dzēst šo sarunu? Šo nevar atsaukt.')) return;
    await fetch('/api/conversations/' + id, { method: 'DELETE' });
    if (activeConv === id) { activeConv = null; showEmpty(); }
    await loadConversations();
}

/* =========================================================
   ZIŅAS
   ========================================================= */
function addMessage(role, text, animate = true) {
    const inner = $('messagesInner');
    const wrap = document.createElement('div');
    wrap.className = 'msg ' + (role === 'assistant' ? 'ai' : 'user');
    if (!animate) wrap.style.animation = 'none';
    wrap.innerHTML = `
        <div class="msg-avatar">${role === 'assistant' ? 'T' : (window.ME || 'Tu')}</div>
        <div class="msg-body">
            <div class="msg-name">${role === 'assistant' ? 'Tutors' : 'Tu'}</div>
            <div class="msg-text">${fmt(text)}</div>
        </div>`;
    inner.appendChild(wrap);
    scrollDown();
}

function showTyping(on) {
    let t = $('typingIndicator');
    if (on) {
        if (!t) {
            t = document.createElement('div');
            t.id = 'typingIndicator';
            t.className = 'msg ai';
            t.innerHTML = `<div class="msg-avatar">T</div><div class="msg-body"><div class="typing show"><span></span><span></span><span></span></div></div>`;
            $('messagesInner').appendChild(t);
        }
        scrollDown();
    } else if (t) { t.remove(); }
}

async function sendMessage() {
    if (sending || !activeConv) return;
    const input = $('msgInput');
    const msg = input.value.trim();
    if (!msg) return;

    sending = true;
    $('sendBtn').disabled = true;
    input.value = '';
    input.style.height = 'auto';
    addMessage('user', msg);
    showTyping(true);

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: activeConv, message: msg })
        });
        const data = await res.json();
        showTyping(false);
        if (data.error) addMessage('assistant', '⚠️ ' + data.error);
        else {
            addMessage('assistant', data.reply);
            // atjauno nosaukumu sarakstā (pirmā ziņa)
            const conv = conversations.find(c => c.id === activeConv);
            if (conv && (conv.title === 'Jauna saruna' || !conv.title)) loadConversations();
        }
    } catch (e) {
        showTyping(false);
        addMessage('assistant', '⚠️ Savienojuma kļūda. Mēģini vēlreiz.');
    }
    sending = false;
    $('sendBtn').disabled = false;
    input.focus();
}

/* =========================================================
   AUGŠUPIELĀDE
   ========================================================= */
async function uploadPdf() {
    if (!selectedFile) { alert('Vispirms izvēlies PDF failu.'); return; }
    const btn = $('uploadBtn');
    btn.disabled = true; btn.textContent = 'Augšupielādē…';

    const fd = new FormData();
    fd.append('pdf', selectedFile);
    fd.append('title', $('upTitle').value.trim());
    fd.append('subject', $('upSubject').value.trim());
    const pub = $('upPublic');
    if (pub) fd.append('is_public', pub.checked ? '1' : '0');

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json();
        if (data.error) { alert(data.error); btn.disabled = false; btn.textContent = 'Augšupielādēt un sākt'; return; }
        await loadMaterials();
        startConversation(data.material.id);  // uzreiz sāk sarunu ar jauno materiālu
    } catch (e) {
        alert('Kļūda augšupielādējot.'); btn.disabled = false; btn.textContent = 'Augšupielādēt un sākt';
    }
}

function setFile(file) {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) { alert('Lūdzu izvēlies PDF failu.'); return; }
    selectedFile = file;
    const drop = $('fileDrop');
    drop.classList.add('has-file');
    $('fileLabel').textContent = '📄 ' + file.name;
    if (!$('upTitle').value.trim()) $('upTitle').value = file.name.replace(/\.pdf$/i, '');
}

/* =========================================================
   SKATU PĀRSLĒGŠANA
   ========================================================= */
function showChat() {
    $('emptyState').style.display = 'none';
    $('messages').style.display = 'block';
    $('composer').style.display = 'block';
}
function showEmpty() {
    $('emptyState').style.display = 'flex';
    $('messages').style.display = 'none';
    $('composer').style.display = 'none';
    $('headInfo').innerHTML = '<span class="head-hint">Sāc jaunu sarunu, lai mācītos</span>';
}
function setHeader(mat) {
    if (mat && mat.title) {
        $('headInfo').innerHTML = `<span class="material-chip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            ${esc(mat.title)} ${mat.subject ? '<span class="subj">· ' + esc(mat.subject) + '</span>' : ''}
        </span>`;
    } else {
        $('headInfo').innerHTML = '<span class="material-chip">Vispārīga saruna</span>';
    }
}
function scrollDown() {
    const m = $('messages');
    requestAnimationFrame(() => { m.scrollTop = m.scrollHeight; });
}

/* ---------- Modālais ---------- */
function openModal() {
    loadMaterials();
    $('uploadForm').classList.remove('show');
    selectedFile = null;
    $('fileDrop').classList.remove('has-file');
    $('fileLabel').textContent = 'Velc PDF šeit vai noklikšķini, lai izvēlētos';
    $('upTitle').value = ''; $('upSubject').value = '';
    $('modal').classList.add('show');
}
function closeModal() { $('modal').classList.remove('show'); }

/* ---------- Mobilā sānjosla ---------- */
function closeSidebarMobile() { $('sidebar').classList.remove('open'); }

/* =========================================================
   NOTIKUMI
   ========================================================= */
$('newChatBtn').addEventListener('click', openModal);
$('startBtn').addEventListener('click', openModal);
$('modalClose').addEventListener('click', closeModal);
$('modal').addEventListener('click', e => { if (e.target === $('modal')) closeModal(); });

$('toggleUpload').addEventListener('click', () => $('uploadForm').classList.toggle('show'));
$('noMaterial').addEventListener('click', () => startConversation(null));
$('uploadBtn').addEventListener('click', uploadPdf);

$('fileDrop').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', e => { if (e.target.files[0]) setFile(e.target.files[0]); });
['dragover','dragenter'].forEach(ev => $('fileDrop').addEventListener(ev, e => { e.preventDefault(); $('fileDrop').classList.add('over'); }));
['dragleave','drop'].forEach(ev => $('fileDrop').addEventListener(ev, e => { e.preventDefault(); $('fileDrop').classList.remove('over'); }));
$('fileDrop').addEventListener('drop', e => { if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); });

$('sendBtn').addEventListener('click', sendMessage);
$('msgInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
$('msgInput').addEventListener('input', e => {
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
});

$('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = '/login';
});

$('menuToggle').addEventListener('click', () => $('sidebar').classList.toggle('open'));

boot();
