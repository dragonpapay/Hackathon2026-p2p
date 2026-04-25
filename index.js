/** @typedef {import('pear-interface')} */
import Runtime from 'pear-electron'
import Bridge from 'pear-bridge'
import Hyperswarm from 'hyperswarm'
import b4a from 'b4a'
import message from 'pear-message'
import messages from 'pear-messages'

Pear.updates((update) => {
  console.log('Actualització disponible:', update)
})

// 1. Iniciem la pantalla (UI)
const bridge = new Bridge({ mount: '/ui', waypoint: 'index.html' })
await bridge.ready()
const runtime = new Runtime()
const pipe = await runtime.start({ bridge })
pipe.on('close', () => Pear.exit())

// 2. Iniciem la xarxa P2P
const swarm = new Hyperswarm()
Pear.teardown(() => swarm.destroy())
const companys = []

// A la part on gestiones la connexió del swarm (Punt 3 del teu index.js)
swarm.on('connection', (peer) => {
  console.log('🟢 NOU COMPANY CONNECTAT!')
  companys.push(peer)
  
  peer.on('data', (dades) => {
    // Envia dades directament a la finestra (UI)
    const hex = b4a.toString(dades, 'hex')
    bridge.send('dades-p2p', hex) 
  })

  peer.on('close', () => {
    const index = companys.indexOf(peer)
    if (index > -1) companys.splice(index, 1)
  })
})

// Escolta el que ve de la finestra (UI) i envia-ho al Swarm
bridge.on('dades-ui', (hex) => {
  const buffer = b4a.from(hex, 'hex')
  for (const peer of companys) {
    peer.write(buffer)
  }
})

// 4. B. Escoltem el text que la nostra pròpia pantalla (UI) ha escrit -> L'enviem a tots els companys P2P
messages({ tipus: 'de-ui-a-p2p' }).on('data', (msg) => {
  const dades = b4a.from(msg.dadesHex, 'hex')
  for (const peer of companys) {
    peer.write(dades) // Ho distribuïm per tota la sala
  }
})

// 5. Unim-nos a la sala secreta de la Hackathon
const clauSala = b4a.alloc(32).fill('hackupc2026-pears-docs-sala-1')
const discovery = swarm.join(clauSala, { client: true, server: true })

discovery.flushed().then(() => {
  console.log('🌐 Connectat a la xarxa. Buscant companys a la sala...')
})