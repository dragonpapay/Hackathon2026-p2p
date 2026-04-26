/** @typedef {import('pear-interface')} */
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
import mammoth from 'mammoth'
const { teardown, updates } = Pear

let swarm = new Hyperswarm()

teardown(() => swarm.destroy())
updates(() => Pear.reload())

// ==========================================
// ELEMENTS DE LA UI
// ==========================================
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

const btnDescarregar = document.querySelector('#btn-descarregar') // RECUPERAT!
const btnImportarDoc = document.querySelector('#btn-importar-doc')
const inputImportarDoc = document.querySelector('#input-importar-doc')

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
      data: new Date().toLocaleDateString(),
      contingut: '<h1>Comença a escriure aquí...</h1>'
    }
    docs.unshift(nouDoc) // Afegim al principi
    localStorage.setItem('pears_documents', JSON.stringify(docs))
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
      <button class="btn-esborrar-doc" title="Esborrar document" onclick="event.stopPropagation(); window.esborrarDocument('${doc.topic}')">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
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

window.esborrarDocument = function(topic) {
    // Confirmació per evitar ensurts
    if (confirm("Segur que vols esborrar aquest document? Aquesta acció no es pot desfer.")) {
        let docs = obtenirDocumentsDesats();
        // Filtrem per treure el que té el topic seleccionat
        docs = docs.filter(d => d.topic !== topic);
        // Guardem la nova llista
        localStorage.setItem('pears_documents', JSON.stringify(docs));
        // Tornem a dibuixar el dashboard
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
  await swarm.destroy();
  
  // Reiniciem variables d'estat
  swarm = new Hyperswarm();
  configurarEventosSwarm();

  vistaEditor.classList.add('hidden');
  vistaDashboard.style.display = 'flex';
  
  if (peersCount) peersCount.innerText = "1 connectats";
  const llista = document.querySelector('#llista-peers');
  if (llista) llista.innerHTML = '';
  
  editor.innerHTML = '<h1>Comença a escriure aquí...</h1>';
  renderitzarDashboard();
});

// ==========================================
// FUNCIONS P2P I CONNEXIÓ
// ==========================================
async function unirSessioExistent(topicString, nom = "Document P2P") {
  documentLoading.classList.remove('hidden')
  const topicBuffer = b4a.from(topicString, 'hex')
  desarDocument(topicString, 'text') // El guardem si l'han introduït manualment
  await connectarSessio(topicBuffer, topicString, nom)
}

function actualitzarLlistaPeers() {
  const llistaElement = document.querySelector('#llista-peers')
  if (!llistaElement) return
  
  llistaElement.innerHTML = ''
  
  // Ens afegim a nosaltres mateixos
  const jo = document.createElement('div')
  jo.style.padding = '8px'; jo.style.fontSize = '12px'; jo.style.borderBottom = '1px solid #eee';
  jo.innerHTML = `<strong>Tu</strong> (Local Host)`;
  llistaElement.appendChild(jo)

  // Afegim cada peer connectat
  for (const peer of swarm.connections) {
    const peerDiv = document.createElement('div')
    peerDiv.style.padding = '8px'; peerDiv.style.fontSize = '11px'; peerDiv.style.borderBottom = '1px solid #eee';
    peerDiv.style.wordBreak = 'break-all';
    
    const nomPeer = b4a.toString(peer.remotePublicKey, 'hex').slice(0, 12) + '...';
    peerDiv.innerHTML = `<span style="color: #2e7d32">●</span> Peer: ${nomPeer}`;
    llistaElement.appendChild(peerDiv)
  }
  
  if (peersCount) peersCount.innerText = `${swarm.connections.size + 1} connectats`
}

async function connectarSessio(topicBuffer, topicString, nom) {
  if (swarm) {
    await swarm.destroy();
    swarm = new Hyperswarm();
  }

  configurarEventosSwarm();
  const discovery = swarm.join(topicBuffer, { client: true, server: true });
  
  topicActual = topicString;
  nomDocActual.innerText = nom;
  topicDisplay.innerText = topicString;

  // Carregar contingut guardat si existeix!
  const docs = obtenirDocumentsDesats();
  const docInfo = docs.find(d => d.topic === topicString);
  if (docInfo && docInfo.contingut) {
      editor.innerHTML = docInfo.contingut;
  } else {
      editor.innerHTML = '<h1>Comença a escriure aquí...</h1>';
  }

  documentLoading.classList.add('hidden');
  vistaDashboard.style.display = 'none';
  vistaEditor.style.display = 'flex';
  vistaEditor.classList.remove('hidden');
  
  actualitzarLlistaPeers();
  await discovery.flushed();
}

function configurarEventosSwarm() {
  swarm.on('connection', (peer) => {
    actualitzarLlistaPeers()

    // Sincronització inicial
    const textActual = editor.innerHTML
    if (textActual && textActual !== '<h1>Comença a escriure aquí...</h1>') {
      peer.write(b4a.from(JSON.stringify({ tipus: 'text', contingut: textActual })))
    }
    const titolActual = nomDocActual.innerText
    peer.write(b4a.from(JSON.stringify({ tipus: 'titol', contingut: titolActual })))

    peer.on('data', data => {
      try {
        const missatge = JSON.parse(b4a.toString(data))
        if (missatge.tipus === 'text') {
          isUpdating = true
          editor.innerHTML = missatge.contingut
          guardarContingutDocument(topicActual, missatge.contingut)
          setTimeout(() => isUpdating = false, 50)
        } else if (missatge.tipus === 'titol') {
          nomDocActual.innerText = missatge.contingut
          actualitzarNomDocument(topicActual, missatge.contingut, false)
        }
      } catch (e) { console.error("Error descodificant JSON", e) }
    })

    peer.on('close', () => actualitzarLlistaPeers())
    peer.on('error', () => actualitzarLlistaPeers())
  })

  swarm.on('update', () => actualitzarLlistaPeers())
}

// Enviar text en escriure
editor.addEventListener('input', () => {
  if (isUpdating || !topicActual) return
  
  const textActual = editor.innerHTML 
  guardarContingutDocument(topicActual, textActual)
  
  const missatge = JSON.stringify({ tipus: 'text', contingut: textActual })
  const dadesAEnviar = b4a.from(missatge)
  
  for (const peer of swarm.connections) peer.write(dadesAEnviar)
})


// ==========================================
// EXPORTAR A WORD (El botó recuperat)
// ==========================================
if (btnDescarregar) {
  btnDescarregar.addEventListener('click', () => {
    const contingutHTML = editor.innerHTML;
    const nomArxiu = (nomDocActual.innerText || 'document_pears').replace(/\s+/g, '_');
    const preHtml = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>${nomArxiu}</title></head><body>`;
    const postHtml = "</body></html>";
    
    const htmlComplet = preHtml + contingutHTML + postHtml;
    const blob = new Blob(['\ufeff', htmlComplet], { type: 'application/msword' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomArxiu + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}

// ==========================================
// IMPORTAR WORD (Lògica de Mammoth)
// ==========================================
if (btnImportarDoc && inputImportarDoc) {
  btnImportarDoc.addEventListener('click', () => {
      inputImportarDoc.click();
  });

  inputImportarDoc.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          const arrayBuffer = event.target.result;
          try {
              const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
              editor.innerHTML = result.value;
              
              if (topicActual) {
                  guardarContingutDocument(topicActual, editor.innerHTML);
                  const missatge = JSON.stringify({ tipus: 'text', contingut: editor.innerHTML });
                  const dadesAEnviar = b4a.from(missatge);
                  for (const peer of swarm.connections) peer.write(dadesAEnviar);
              }
          } catch (err) {
              console.error("Error important document:", err);
              alert("Hi ha hagut un error en llegir l'arxiu Word.");
          }
      };
      reader.readAsArrayBuffer(file);
  });
}


// ==========================================
// CONTROLS DE LA FINESTRA
// ==========================================
document.querySelectorAll('.minimize-app').forEach(btn => {
  btn.addEventListener('click', () => Pear.Window.self.minimize())
})

document.querySelectorAll('.maximize-app').forEach(btn => {
  btn.addEventListener('click', async () => {
    const isMax = await Pear.Window.self.isMaximized()
    if (isMax) Pear.Window.self.restore()
    else Pear.Window.self.maximize()
  })
})

document.querySelectorAll('.close-app').forEach(btn => {
  btn.addEventListener('click', () => Pear.Window.self.close())
})

// ==========================================
// FUNCIONS DE TÍTOL I GUARDAT DE CONTINGUT
// ==========================================
function actualitzarNomDocument(topic, nouNom, enviarAPeers = true) {
  if (!topic) return;
  const docs = obtenirDocumentsDesats();
  const docIndex = docs.findIndex(d => d.topic === topic);
  if (docIndex !== -1) {
    docs[docIndex].nom = nouNom;
    localStorage.setItem('pears_documents', JSON.stringify(docs));
    renderitzarDashboard();
  }

  if (enviarAPeers && swarm.connections.size > 0) {
    const missatge = JSON.stringify({ tipus: 'titol', contingut: nouNom });
    const dadesAEnviar = b4a.from(missatge);
    for (const peer of swarm.connections) peer.write(dadesAEnviar);
  }
}

nomDocActual.addEventListener('blur', () => {
  actualitzarNomDocument(topicActual, nomDocActual.innerText);
});

nomDocActual.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    nomDocActual.blur();
  }
});

function guardarContingutDocument(topic, html) {
  if (!topic) return;
  const docs = obtenirDocumentsDesats();
  const docIndex = docs.findIndex(d => d.topic === topic);
  
  if (docIndex !== -1) {
    docs[docIndex].contingut = html; 
    localStorage.setItem('pears_documents', JSON.stringify(docs));
  }
}