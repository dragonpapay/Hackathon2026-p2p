/** @typedef {import('pear-interface')} */
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
const { teardown, updates } = Pear

let swarm = new Hyperswarm()

teardown(() => swarm.destroy())
updates(() => Pear.reload())

// Elements de la UI
const vistaDashboard = document.querySelector('#vista-dashboard')
const vistaEditor = document.querySelector('#vista-editor')
const documentLoading = document.querySelector('#loading')

const formJoin = document.querySelector('#join-form')
const inputTopic = document.querySelector('#join-chat-room-topic')
const btnCreateText = document.querySelector('#create-text-doc')
const btnCreatePdf = document.querySelector('#create-pdf-doc') // PENDENT DE LOGICA PDF
const btnTornarDashboard = document.querySelector('#btn-tornar-dashboard')

const editor = document.querySelector('#notepad')
const topicDisplay = document.querySelector('#chat-room-topic')
const peersCount = document.querySelector('#peers-count')
const graellaRecents = document.querySelector('#graella-recents')
const nomDocActual = document.querySelector('#nom-doc-actual')

let isUpdating = false 
let topicActual = null

// ==========================================
// LÒGICA DE LOCALSTORAGE (El Taulell de Recents)
// ==========================================
function obtenirDocumentsDesats() {
  const docs = localStorage.getItem('pears_documents')
  return docs ? JSON.parse(docs) : []
}

function desarDocument(topic, tipus = 'text') {
  const docs = obtenirDocumentsDesats()
  const existeix = docs.find(d => d.topic === topic)
  
  if (!existeix) {
    const nouDoc = {
      topic: topic,
      nom: tipus === 'text' ? 'Nou Bloc de Notes' : 'Nou PDF P2P',
      tipus: tipus,
      data: new Date().toLocaleDateString()
    }
    docs.unshift(nouDoc) // Afegim al principi
    localStorage.setItem('pears_documents', JSON.stringify(docs))
  }
}
function guardarContingutDocument(topic, html) {
  if (!topic) return;
  const docs = obtenirDocumentsDesats();
  const docIndex = docs.findIndex(d => d.topic === topic);
  
  if (docIndex !== -1) {
    docs[docIndex].contingut = html; // Guardem l'HTML exacte
    localStorage.setItem('pears_documents', JSON.stringify(docs));
  }
}

function renderitzarDashboard() {
  const docs = obtenirDocumentsDesats()
  graellaRecents.innerHTML = '' // Netegem

  if (docs.length === 0) {
    graellaRecents.innerHTML = '<div style="color: #999; grid-column: 1 / -1;">Encara no tens cap document recent. Crea\'n un a dalt!</div>'
    return
  }

  docs.forEach(doc => {
    // Icona depenent de si és Text o PDF
    const iconaText = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`
    const iconaPdf = `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d32f2f" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M9 15v-4.5a1.5 1.5 0 0 1 3 0V15"></path><path d="M9 13h3"></path></svg>`
    
    const div = document.createElement('div')
    div.className = 'doc-item'
    div.innerHTML = `
      <button class="btn-esborrar-doc" title="Esborrar document" onclick="event.stopPropagation(); esborrarDocument('${doc.topic}')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>

      <div class="doc-preview">
        ${doc.tipus === 'text' ? iconaText : iconaPdf}
      </div>
      <div class="doc-info">
        <div class="doc-titol">${doc.nom}</div>
        <div class="doc-meta">Última obertura: ${doc.data}</div>
      </div>
    `
    // En fer clic a una "targeta" del dashboard, ens unim directament a aquell topic
    div.addEventListener('click', () => unirSessioExistent(doc.topic, doc.nom))
    graellaRecents.appendChild(div)
  })
}

// I posem la funció d'esborrar just a sota
window.esborrarDocument = function(topic) {
    if (confirm("Segur que vols esborrar aquest document? Aquesta acció no es pot desfer.")) {
        let docs = obtenirDocumentsDesats();
        // Filtrem els documents perquè NO incloguin el que acabem de clicar
        docs = docs.filter(d => d.topic !== topic);
        localStorage.setItem('pears_documents', JSON.stringify(docs));
        
        // Tornem a dibuixar la llista
        renderitzarDashboard(); 
    }
}

// Inicialitzem el taulell a l'arrencar
renderitzarDashboard()

// ==========================================
// ACCIONS DELS BOTONS DEL DASHBOARD
// ==========================================
btnCreateText.addEventListener('click', async () => {
  documentLoading.classList.remove('hidden')
  const topicBuffer = crypto.randomBytes(32)
  const topicString = b4a.toString(topicBuffer, 'hex')
  
  desarDocument(topicString, 'text')
  await connectarSessio(topicBuffer, topicString, 'Nou Bloc de Notes')
})

btnCreatePdf.addEventListener('click', async () => {
  // Pendent: Aquí hauries de canviar el visor contenteditable per un render de PDF (ex: pdf.js)
  alert("El mode PDF encara s'està desenvolupant, s'obrirà l'editor de text estàndard.")
  documentLoading.classList.remove('hidden')
  const topicBuffer = crypto.randomBytes(32)
  const topicString = b4a.toString(topicBuffer, 'hex')
  
  desarDocument(topicString, 'pdf')
  await connectarSessio(topicBuffer, topicString, 'Nou PDF P2P')
})

formJoin.addEventListener('submit', async (e) => {
  e.preventDefault()
  const topicString = inputTopic.value
  await unirSessioExistent(topicString, 'Document Importat')
})

btnTornarDashboard.addEventListener('click', async () => {
  // Tanquem la connexió actual per tornar al taulell
  await swarm.destroy()
  swarm = new Hyperswarm() // Resejem el swarm
  configurarEventosSwarm() // Tornem a adjuntar els listeners de P2P
  
  vistaEditor.classList.add('hidden')
  vistaDashboard.style.display = 'flex'
  editor.innerHTML = '<h1>Comença a escriure aquí...</h1>' // Netegem
  renderitzarDashboard() // Refresquem per si hi ha nous documents
})

// ==========================================
// FUNCIONS P2P
// ==========================================
async function unirSessioExistent(topicString, nom = "Document P2P") {
  documentLoading.classList.remove('hidden')
  const topicBuffer = b4a.from(topicString, 'hex')
  desarDocument(topicString, 'text') // El guardem si l'han introduït manualment
  await connectarSessio(topicBuffer, topicString, nom)
}

async function connectarSessio(topicBuffer, topicString, nom) {
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()

  topicActual = topicString
  nomDocActual.innerText = nom
  topicDisplay.innerText = topicString

  // --- NOU: RECUPEREM EL TEXT AMB EL SISTEMA DE L'AMIC ---
  const docs = obtenirDocumentsDesats();
  const docInfo = docs.find(d => d.topic === topicString);
  
  if (docInfo && docInfo.contingut) {
      editor.innerHTML = docInfo.contingut;
  } else {
      editor.innerHTML = '<h1>Comença a escriure aquí...</h1>';
  }
  // -------------------------------------------------------

  documentLoading.classList.add('hidden')
  vistaDashboard.style.display = 'none'
  vistaEditor.style.display = 'flex'
  vistaEditor.classList.remove('hidden')
  
  peersCount.innerText = `${swarm.connections.size + 1} connectats`
}

function configurarEventosSwarm() {
  swarm.on('connection', (peer) => {
    peersCount.innerText = `${swarm.connections.size + 1} connectats`

    // --- SINCRONITZACIÓ INICIAL ETIQUETADA ---
    const textActual = editor.innerHTML;
    if (textActual && textActual !== '<h1>Comença a escriure aquí...</h1>') {
        const missatgeText = JSON.stringify({ tipus: 'text', contingut: textActual });
        peer.write(b4a.from(missatgeText));
    }
    
    // També enviem el títol inicial a qui s'acaba de connectar!
    const titolActual = nomDocActual.innerText;
    if (titolActual && titolActual !== 'Document sense títol') {
        const missatgeTitol = JSON.stringify({ tipus: 'titol', contingut: titolActual });
        peer.write(b4a.from(missatgeTitol));
    }
    // -------------------------------------------

    peer.on('data', data => {
      try {
        // Descodifiquem el JSON que ens arriba
        const missatge = JSON.parse(b4a.toString(data));

        if (missatge.tipus === 'text') {
            isUpdating = true;
            editor.innerHTML = missatge.contingut;
            guardarContingutDocument(topicActual, missatge.contingut);
            setTimeout(() => isUpdating = false, 50);
            
        } else if (missatge.tipus === 'titol') {
            // Si el que rebem és un títol, actualitzem l'element i el guardem
            nomDocActual.innerText = missatge.contingut;
            actualitzarNomDocument(topicActual, missatge.contingut, false); // El false evita bucles infinits
        }
      } catch (e) {
        console.log("Dada rebuda no és un JSON vàlid o és format antic:", e);
      }
    })
    
    peer.on('error', e => console.log(`Connection error: ${e}`))
  })

  swarm.on('update', () => {
    peersCount.innerText = `${swarm.connections.size + 1} connectats` 
  })
}

// Inicialitzem els esdeveniments del P2P
configurarEventosSwarm()

// Enviar text en escriure
editor.addEventListener('input', () => {
  if (isUpdating) return
  const textActual = editor.innerHTML 
  
  guardarContingutDocument(topicActual, textActual)
  
  // NOU: Empaquetem en JSON indicant que és text
  const missatge = JSON.stringify({ tipus: 'text', contingut: textActual })
  const dadesAEnviar = b4a.from(missatge)
  
  const peers = [...swarm.connections]
  for (const peer of peers) peer.write(dadesAEnviar)
})


// ==========================================
// CONTROLS DE LA FINESTRA (Minimitzar, Expandir, Tancar)
// ==========================================

// Minimitzar
document.querySelectorAll('.minimize-app').forEach(btn => {
  btn.addEventListener('click', () => {
    Pear.Window.self.minimize()
  })
})

// Expandir / Restaurar
document.querySelectorAll('.maximize-app').forEach(btn => {
  btn.addEventListener('click', async () => {
    // Comprovem si ja està a pantalla completa
    const isMax = await Pear.Window.self.isMaximized()
    if (isMax) {
      Pear.Window.self.restore() // Torna a la mida normal
    } else {
      Pear.Window.self.maximize() // Expandeix al màxim
    }
  })
})

// Tancar completament l'aplicació
document.querySelectorAll('.close-app').forEach(btn => {
  btn.addEventListener('click', () => {
    Pear.Window.self.close()
  })
})
// ==========================================
// CANVIAR NOM DEL DOCUMENT
// ==========================================
nomDocActual.addEventListener('blur', () => {
  actualitzarNomDocument(topicActual, nomDocActual.innerText);
});

nomDocActual.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nomDocActual.blur(); // Treu el focus per activar el 'blur' i guardar
  }
});

function actualitzarNomDocument(topic, nouNom, enviarAPeers = true) {
  if (!topic) return;
  const docs = obtenirDocumentsDesats();
  const docIndex = docs.findIndex(d => d.topic === topic);
  
  if (docIndex !== -1) {
    docs[docIndex].nom = nouNom;
    localStorage.setItem('pears_documents', JSON.stringify(docs));
    renderitzarDashboard(); // Actualitzem el taulell de fons
  }

  // NOU: Si ho hem canviat nosaltres, avisem a la resta de la xarxa P2P
  if (enviarAPeers) {
    const missatge = JSON.stringify({ tipus: 'titol', contingut: nouNom });
    const dadesAEnviar = b4a.from(missatge);
    
    const peers = [...swarm.connections];
    for (const peer of peers) {
        peer.write(dadesAEnviar);
    }
  }
}
// ==========================================
// EXPORTACIÓ DE DOCUMENTS
// ==========================================
const btnDescarregar = document.querySelector('#btn-descarregar');

btnDescarregar.addEventListener('click', () => {
  // 1. Agafem el contingut HTML de l'editor
  const contingutHTML = editor.innerHTML;

  // 2. Agafem el nom actual del document per posar-li a l'arxiu
  const nomArxiu = (nomDocActual.innerText || 'document_pears').replace(/\s+/g, '_');

  // 3. Creem la capçalera per a Word
  const preHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${nomArxiu}</title></head><body>
  `;
  const postHtml = "</body></html>";
  
  // 4. Juntem-ho tot
  const htmlComplet = preHtml + contingutHTML + postHtml;
  
  // 5. Creem un "Blob" (que és bàsicament un fitxer temporal a la memòria)
  // Hi afegim '\ufeff' (BOM) perquè reconegui bé els accents (à, é, í, ò, ú, ç...)
  const blob = new Blob(['\ufeff', htmlComplet], {
      type: 'application/msword'
  });
  
  // 6. Creem un enllaç de descàrrega invisible i el cliquem automàticament
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${nomArxiu}.doc`; // Li posem l'extensió .doc
  
  document.body.appendChild(link);
  link.click(); // Forcem el clic
  
  // 7. Netegem la brossa de la memòria
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});