'use strict'

const TCP = require('libp2p-tcp')
const MulticastDNS = require('libp2p-mdns')
const WS = require('libp2p-websockets')
const UTP = require('libp2p-utp')
const wrtc = require('webrtc')
const WStar = new (require('libp2p-webrtc-star'))({ wrtc: wrtc })
const Bootstrap = require('libp2p-railing')
const spdy = require('libp2p-spdy')
const KadDHT = require('libp2p-kad-dht')
const mplex = require('libp2p-mplex')
const secio = require('libp2p-secio')
const defaultsDeep = require('@nodeutils/defaults-deep')
const libp2p = require('libp2p')

function mapMuxers(list) {
  return list.map((pref) => {
    if (typeof pref !== 'string') {
      return pref
    }
    switch (pref.trim().toLowerCase()) {
      case 'spdy':
        return spdy
      case 'mplex':
        return mplex
      default:
        throw new Error(pref + ' muxer not available')
    }
  })
}

function getMuxers(muxers) {
  const muxerPrefs = process.env.LIBP2P_MUXER
  if (muxerPrefs && !muxers) {
    return mapMuxers(muxerPrefs.split(','))
  } else if (muxers) {
    return mapMuxers(muxers)
  } else {
    return [mplex, spdy]
  }
}

class Node extends libp2p {
  constructor(_options) {
    const defaults = {
      modules: {
        transport: [
          TCP,
          WS,
          WStar
        ],
        streamMuxer: getMuxers(_options.muxer),
        connEncryption: [secio],
        peerDiscovery: [
          //WStar.discovery,
          MulticastDNS,
          Bootstrap
        ],
        dht: KadDHT
      },
      config: {
        peerDiscovery: {
          mdns: {
            interval: 10000,
            enabled: true
          },
          bootstrap: {
            interval: 10000,
            enabled: false,
            list: _options.bootstrapList
          }
        },
        dht: {
          kBucketSize: 20
        }
      }
    }

    super(defaultsDeep(_options, defaults))
  }
}

module.exports = Node
