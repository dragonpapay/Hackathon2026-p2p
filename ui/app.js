/** @typedef {import('pear-interface')} */
import Hyperswarm from 'hyperswarm'
import crypto from 'hypercore-crypto'
import b4a from 'b4a'
const { teardown, updates } = Pear

const swarm = new Hyperswarm()

teardown(() => swarm.destroy())
updates(() => Pear.reload())

const notepad = document.querySelector('#notepad')

// 1. QUAN REBEM DADES D'UN ALTRE ORDINADOR
swarm.on('connection', (peer) => {
  peer.on('data', data => {
    // Actualitzem el text del bloc de notes amb el que rebem
    notepad.value = b4a.toString(data)
  })
  peer.on('error', e => console.log(`Connection error: ${e}`))
})

swarm.on('update', () => {
  document.querySelector('#peers-count').textContent = swarm.connections.size
})

document.querySelector('#create-chat-room').addEventListener('click', createChatRoom)
document.querySelector('#join-form').addEventListener('submit', joinChatRoom)

// 2. QUAN NOSALTRES ESCRIVIM ALGUNA COSA
notepad.addEventListener('input', (e) => {
  const textActual = e.target.value
  const dadesAEnviar = b4a.from(textActual)
  
  // Enviem a tothom
  const peers = [...swarm.connections]
  for (const peer of peers) peer.write(dadesAEnviar)
})

async function createChatRoom() {
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
 
  const discovery = swarm.join(topicBuffer, { client: true, server: true })
  await discovery.flushed()
 
  const topic = b4a.toString(topicBuffer, 'hex')
  document.querySelector('#chat-room-topic').innerText = topic
  document.querySelector('#loading').classList.add('hidden')
  document.querySelector('#chat').classList.remove('hidden')
}