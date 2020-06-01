const { HyperdriveClient } = require('hyperdrive-daemon-client')
const createSchema = require('./')
const { graphql } = require('graphql')

const client = new HyperdriveClient()
const schema = createSchema(client)

client.ready(onready)

function query(q) {
  return graphql(schema, q).then(onresponse, onerror)
  function onresponse({ data, errors }) {
    return data ? data : onerror(errors && errors.join('\n'))
  }
}

function onerror(err) {
  console.error(err.stack || err)
}

async function onready() {
  const result = await query(`
    query {
      client { endpoint }

      stats {
        path
        metadata {
          key
        }
      }

      drives {
        id key discoveryKey
        stats {
          metadata { peers }
          content { peers }
        }
      }
    }
  `)

  console.log(result);
}
