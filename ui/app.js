// For interactive documentation and code auto-completion in editor
/** @typedef {import('pear-interface')} */
 
/* global Pear */
import Hyperswarm from 'hyperswarm'   // Module for P2P networking and connecting peers
import crypto from 'hypercore-crypto' // Cryptographic functions for generating the key in app
import b4a from 'b4a'                 // Module for buffer-to-string and vice-versa conversions
const { teardown, updates } = Pear    // Functions for cleanup and updates
 
const swarm = new Hyperswarm()
 
// Unannounce the public key before exiting the process
// (This is not a requirement, but it helps avoid DHT pollution)
teardown(() => swarm.destroy())
 
// Enable automatic reloading for the app
// This is optional but helpful during production
updates(() => Pear.reload())
 
 
// When there's updates to the swarm, update the peers count
swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = swarm.connections.size
})
 
document.querySelector('#create-chat-room').addEventListener('click', createChatRoom)
document.querySelector('#join-form').addEventListener('submit', joinChatRoom)

 
async function createChatRoom() {
  // Generate a new random topic (32 byte string)
  const topicBuffer = crypto.randomBytes(32)
  joinSwarm(topicBuffer)
}
 
async function joinChatRoom (e) {
  e.preventDefault()
  const topicStr = document.querySelector('#join-chat-room-topic').value
  const topicBuffer = b4a.from(topicStr, 'hex')
  joinSwarm(topicBuffer)
}
 
async function joinSwarm (topicBuffer) {
  document.querySelector('#setup').classList.add('hidden')
  document.querySelector('#loading').classList.remove('hidden')
 
  // Join the swarm with the topic. Setting both client/server to true means that this app can act as both.
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()
 
  const topic = b4a.toString(topicBuffer, 'hex')
  document.querySelector('#chat-room-topic').innerText = topic
  document.querySelector('#loading').classList.add('hidden')
  document.querySelector('#chat').classList.remove('hidden')
}

// 1. Agafem l'element del bloc de notes
const notepad = document.querySelector('#notepad')

// 2. Quan JO escric alguna cosa...
notepad.addEventListener('input', (e) => {
  const textActual = e.target.value
  
  // Convertim el text a Bytes (Buffer) abans d'enviar
  const dadesAEnviar = b4a.from(textActual)
  
  // L'enviem a tots els companys connectats
  const peers = [...swarm.connections]
  for (const peer of peers) {
    peer.write(dadesAEnviar) 
  }

  // ✨ TRUC VISUAL: Posem la vora blava per confirmar que ENVIEM
  notepad.style.borderColor = '#0088ff' 
  setTimeout(() => { notepad.style.borderColor = '#B0D944' }, 300) // Torna al color normal ràpid
})

// 3. Quan rebem dades d'un altre peer...
swarm.on('connection', (peer) => {
  peer.on('data', data => {
    // Traduïm els bytes a text
    const textRebut = b4a.toString(data)
    
    // Canviem el text de la pantalla
    notepad.value = textRebut 
    
    // ✨ TRUC VISUAL: Posem la vora vermella per confirmar que REBEM
    notepad.style.borderColor = '#ff0044' 
    setTimeout(() => { notepad.style.borderColor = '#B0D944' }, 300) // Torna al color normal ràpid
  })
})
