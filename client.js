'use strict'
/* eslint-disable no-console */

const PeerInfo = require('peer-info')
const Node = require('./libp2p-bundle.js')
const pull = require('pull-stream')
const Pushable = require('pull-pushable')
const PROTOCOL_STRING = '/chat/1.0.0'

try {
  const chat = (conn) => {
    conn.getPeerInfo((err, peerInfo) => {
      const p = Pushable()
      // Write operation. Data sent as a buffer
      pull(p, conn)
      // Sink, data converted from buffer to utf8 string
      pull(conn, pull.map((data) => {
          return peerInfo.id.toB58String() + ' : ' + data.toString('utf8').replace('\n', '')
        }),
        pull.drain(console.log)
      )
      process.stdin.setEncoding('utf8')
      process.openStdin().on('data', (chunk) => {
        let data = chunk.toString()
        p.push(data)
      })
    })
  }

  //Create Peer Info
  PeerInfo.create((err, peerInfo) => {
    if (err) {
      throw err
    }
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
    peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0/ws')
    peerInfo.multiaddrs.add(`/dns4/star-signal.cloud.ipfs.team/tcp/443/wss/p2p-webrtc-star/ipfs/${peerInfo.id.toB58String()}`)



    const node = new Node({
      peerInfo
    })

    node.start((err) => {
      if (err) {
        throw err
      }
      console.info("Libp2p has started, along with all its services.")

      node.handle(PROTOCOL_STRING, (protocol, conn) => {
        console.info('Handle' + PROTOCOL_STRING + ' protocol.')
        chat(conn)
      })


      node.on('peer:discovery', (peer) => {
        try {
          node.peerBook.get(peer.id.toB58String())
        } catch (err) {
          console.info('Peer has been discovered.')
          console.info('Discovered:', peer.id.toB58String())
          console.log('Dialing to another peer in the network and selecting a protocol to talk with that peer.')
          node.dialProtocol(peer, PROTOCOL_STRING, (err, conn) => {
            if (err) {
              throw err
            }
            console.info('Connection Dialing established, now we have a connection to the peer')
            chat(conn)
          })
        }
      })

      node.on('peer:connect', (peer) => {
        console.info('We connected to a new peer.')
        console.log('Connected:', peer.id.toB58String())
      })

      node.on('peer:disconnect', (peer) => {
        console.info('We disconnected from Peer')
        console.log('Disconnected:', peer.id.toB58String())
      })

      node.on('stop', (err) => {
        if (err) {
          throw err
        }
        console.info("Libp2p has stopped, along with all its services.")

      })

      node.on('error', (err) => {
        if (err) {
          throw err
        }
        console.info("An error has occurred", err)
      })

      // At this point the node has started
      console.log('node has started (true/false):', node.isStarted())
      // And we can print the now listening addresses.
      // If you are familiar with TCP, you might have noticed
      // that we specified the node to listen in 0.0.0.0 and port
      // 0, which means "listen in any network interface and pick
      // a port for me
      console.log('listening on:')
      node.peerInfo.multiaddrs.forEach((ma) => console.log(ma.toString()))

    })

  })

} catch (err) {
  console.error('Error ', err)
}
