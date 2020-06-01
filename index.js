const { SchemaComposer } = require('graphql-compose')
const path = require('path')
const fs = require('fs')

const SCHEMA_PATH = path.join(__dirname, 'schema.graphql')
const SCHEMA_SOURCE = fs.readFileSync(SCHEMA_PATH, 'utf8')

const flatten = (array) => array.flat()
const toHex = (buf) => Buffer.isBuffer(buf) ? buf.toString('hex') : null

/**
 * Predicates an `object` based on a filter object allowing the following
 * special filters on keys:
 *   * <key> - strictly equal to
 *   * <key>_ne - strictly not equal to
 *   * <key>_gt - greater than
 *   * <key>_lt - less than
 *   * <key>_gte - greater than or equal to
 *   * <key>_lte - less than or equal to
 *
 * @private
 * @param {Object} filter
 * @param {Object} object
 * @param {Boolean}
 */
function where(filter, object) {
  const keys = Object.keys(filter || {})

  for (const key of keys) {
    const value = filter[keys]
    const absoluteKey = key.replace(/(_(ne|gt|lt|gte|lte))$/,'')

    if (undefined === value) {
      continue
    }

    // not equal to
    if (/_ne$/.test(key) && value == object[absoluteKey]) {
      return false
    }

    // greater than
    if (/_gt$/.test(key) && object[absoluteKey] <= value) {
      return false
    }

    // greater than equal to
    if (/_gte$/.test(key) && object[absoluteKey] < value) {
      return false
    }

    if (/_lt$/.test(key) && object[absoluteKey] >= value) {
      return false
    }

    if (/_lte$/.test(key) && object[absoluteKey] > value) {
      return false
    }

    if (key === absoluteKey && value !== object[absoluteKey]) {
      return false
    }
  }

  return true
}

/**
 * Creates a GraphQLSchema for a HyperdriveClient.
 * @param {HyperdriveClient} client
 * @return {GraphQLSchema}
 */
function createSchema(client) {
  const composer = new SchemaComposer(SCHEMA_SOURCE)

  const DrivesFilterInput = composer.getITC('DrivesFilterInput')
  const MetadataStats = composer.getOTC('MetadataStats')
  const Client = composer.getOTC('Client')
  const Drive = composer.getOTC('Drive')
  const Query = composer.getOTC('Query')
  const Stats = composer.getOTC('Stats')
  const Peer = composer.getOTC('Peer')

  MetadataStats.addFields({
    key: {
      type: 'String',
      resolve: ({ key }, args) => toHex(key) || key
    }
  })

  Drive.addFields({
    key: {
      type: 'String',
      resolve: ({ key }, args) => toHex(key) || key
    },

    discoveryKey: {
      type: 'String',
      resolve: ({ discoveryKey }, args) => toHex(discoveryKey) || discoveryKey
    },

    stats: {
      type: [Stats],
      resolve: (ctx, args) => ctx.stats().then(({ stats }) => flatten(stats))
    },
  })

  Query.addFields({
    client: {
      type: Client,
      resolve: (ctx, args) => client
    },

    stats: {
      type: [Stats],
      resolve: (ctx, args) => client.drive.allStats().then(flatten)
    },

    drive: {
      type: Drive,
      resolve: (ctx, args) => client.get(args)
    },

    drives: {
      type: [Drive],
      args: { where: DrivesFilterInput },
      resolve: (ctx, args) => getDrives(args)
    },

    peers: {
      type: [Peer],
      args: { discoveryKey: 'String' },
      resolve: (ctx, args) => client.peers.listPeers(args.discoveryKey)
    }
  })

  return composer.buildSchema()

  async function getDrives(opts) {
    const allStats = await client.drive.allStats()
    const keys = allStats.flat().map((stat) => stat.metadata.key)
    const drives = await Promise.all(keys.map((key) => client.drive.get({ key })))

    if (!opts.where) {
      return drives
    }

    const results = []
    const stats = flatten(await Promise.all(drives.map((drive) => {
      return drive.stats().then(({ stats }) => stats.map(({ content }) => content))
    })))

    for (let i = 0; i < stats.length; ++i) {
      const stat = stats[i]
      const drive = drives[i]

      stat.id = drive.id
      stat.key = toHex(drive.key)
      stat.discoveryKey = toHex(drive.discoveryKey)

      if (where(opts.where, stat)) {
        results.push(drive)
      }
    }

    return results
  }
}

/**
 * Module exports.
 */
module.exports = createSchema
