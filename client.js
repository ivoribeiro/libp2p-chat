'use strict'
/* eslint-disable no-console */

const PeerInfo = require('peer-info')
const Node = require('./libp2p-bundle.js')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')

function chat(conn) {
  conn.getPeerInfo((err, peerInfo) => {
    const p = Pushable()
    // Write operation. Data sent as a buffer
    pull(
      p,
      conn
    )
    // Sink, data converted from buffer to utf8 string
    pull(
      conn,
      pull.map((data) => {
        return peerInfo.id.toB58String() + ' : ' + data.toString('utf8').replace('\n', '')
      }),
      pull.drain(console.log)
    )

    process.stdin.setEncoding('utf8')
    process.openStdin().on('data', (chunk) => {
      var data = chunk.toString()
      p.push(data)
    })
  })
}

PeerInfo.create((err, peerInfo) => {
  if (err) {
    throw err
  }
  peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
  const node = new Node({
    peerInfo
  })

  node.start((err) => {
    if (err) {
      throw err
    }

    node.on('peer:discovery', (peer) => {
      try {
        node.peerBook.get(peer.id.toB58String())
      } catch (err) {      
        console.log('Discovered:', peer.id.toB58String())
        node.dialProtocol(peer, '/chat/1.0.0', (err, conn) => {
          if (err) {
            throw err
          }
          chat(conn)
        })
      }
    })

    node.on('peer:connect', (peer) => {
      console.log('Connected:', peer.id.toB58String())
    })

    node.handle('/chat/1.0.0', (protocol, conn) => {
      chat(conn)
    })
  })
})
