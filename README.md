hyperdrive-daemon-client-graphql
================================

> A [GraphQL](https://graphql.org) interface over a connected [Hyperdrive Daemon Client](https://github.com/hypercore-protocol/hyperdrive-daemon-client).

## Installation

```sh
$ npm install hyperdrive-daemon-client-graphql
```

## Schema

See [schema.graphql](schema.graphql) for the GraphQL schema you can query.

## Usage

```js
const { HyperdriveClient } = require('hyperdrive-daemon-client')
const createSchema = require('hyperdrive-daemon-client-graphql')
const { graphql } = require('graphql')

const client = new HyperdriveClient()
const schema = createSchema(client)

client.ready(async () => {
  const { drives, stats } = await graphql(schema, `
    query {
      stats { path metadata { key } content { peers} }
      drives { key discoveryKey }
    }
  `)
})
```

### Filters

Input types like `DrivesFilterInput` support special suffix values in
keys to support various filters:

* `<key>` - strictly equal to
* `<key>_ne` - strictly not equal to
* `<key>_gt` - greater than
* `<key>_lt` - less than
* `<key>_gte` - greater than or equal to
* `<key>_lte` - less than or equal to

#### Example

```graphql
query {
  ## query for drives that have at least 1 peer
  drives(where: { peers_gte 1 }) {
    key discoveryKey
  }
}
```

## API

### `schema = createSchema(hyperdriveClient)`

Creates a GraphQL schema for a given `HyperdriveClient`.

```js
const { HyperdriveClient } = require('hyperdrive-daemon-client')
const createSchema = require('hyperdrive-daemon-client-graphql')

const client = new HyperdriveClient()
const schema = createSchema(client)
```

## License

MIT
