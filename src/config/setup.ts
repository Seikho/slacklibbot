import * as db from 'webscaledb'
import * as path from 'path'
import * as fs from 'fs'
import * as process from 'process'
import * as aws from 'aws-sdk'

const DB_NAME = path.join(process.cwd(), 'database', 'config.json')

export interface DefaultParams {
  defaultParams: {
    icon_emoji: string
    username: string
    as_user: boolean
  }
}

export interface BaseConfig extends DefaultParams {
  token: string

  name: string
  emoji: string
  channel: string
  timezone: number

  debug: boolean
  log: boolean
}

export function configure<TConfig>() {
  return {
    getter: getConfig<TConfig>(),
    setter: setConfig<TConfig>()
  }
}

function getConfig<TConfig>() {
  const getter = (): TConfig & BaseConfig => {
    const raw = db.get()
    const config = parseConfig<TConfig & BaseConfig>(raw)
    return config
  }
  return getter
}

function parseConfig<TConfig>(rawConfig: db.Config) {
  const cfg = rawConfig as TConfig

  const config = { ...defaultConfig, ...(cfg as any) }
  return {
    ...config,
    defaultParams: {
      icon_emoji: config.emoji,
      username: config.name,
      as_user: false
    }
  } as TConfig
}

function setConfig<TConfig>() {
  const setter = async (key: keyof (TConfig & DefaultConfig), value: any) => {
    const originalValue = db.get(key)
    const parseReqd =
      originalValue !== undefined && typeof originalValue !== 'string' && typeof value === 'string'
    const valueToStore = parseReqd ? JSON.parse(value) : value
    db.set(key, valueToStore)
    await backupToDynamoAsync()
    const newConfig = parseConfig(db.get())
    return newConfig as TConfig & DefaultConfig
  }

  return setter
}

export async function initialiseConfig(config: any) {
  // If the config file does not exist, create one
  try {
    fs.statSync(DB_NAME)
  } catch (ex) {
    fs.writeFileSync(DB_NAME, '{}')
    await backupAsync({ token: process.env.SLACK_TOKEN || '', ...defaultConfig, ...config })
  }

  const currentConfig = await restoreFromDynamoAsync()
  if (!currentConfig.token) {
    throw new Error('ConfigError: Token is not configured')
  }
  await backupToDynamoAsync({ ...config, ...currentConfig })
}

export type DefaultConfig = typeof defaultConfig

export const defaultConfig = Object.freeze({
  name: 'SlacklibBot',
  emoji: ':robot_face:',
  channel: 'general',
  timezone: 8,
  debug: false,
  log: false
})

// @ts-ignore TS6133
function backupToDynamoAsync<TConfig>(cfg?: TConfig) {
  if (cfg) {
    for (const key in cfg) {
      db.set(key, (cfg as any)[key])
    }
  }
  return new Promise<void>((resolve, reject) => {
    const docClient = new aws.DynamoDB.DocumentClient()
    const params = {
      TableName: process.env.SLACKLIBBOT_TABLE_NAME!,
      Item: {
        Id: process.env.SLACKLIBBOT_CONFIG_NAME!,
        cfg: (db.get() || {}) as {}
      }
    }
    console.debug({ msg: 'backing up to dynamodb', params: params })
    docClient.put(params, function(err, _) {
      if (err) {
        console.error({ msg: 'error backing up to dynamodb', err: err })
        return reject(err)
      } else {
        return resolve()
      }
    })
  })
}

// @ts-ignore TS6133
function restoreFromDynamoAsync() {
  return new Promise<db.Config>((resolve, reject) => {
    const docClient = new aws.DynamoDB.DocumentClient()
    const params = {
      TableName: process.env.SLACKLIBBOT_TABLE_NAME!,
      KeyConditionExpression: 'Id = :i',
      ExpressionAttributeValues: {
        ':i': process.env.SLACKLIBBOT_CONFIG_NAME!
      }
    }
    docClient.query(params, function(err, data) {
      if (err) {
        console.error({ msg: 'error restoring from dynamodb', err: err })
        return reject(err)
      } else {
        const { Items } = data
        if (Items) {
          console.debug({ msg: 'got data from dynamodb', data: data })
          try {
            const cfg = Items[0].cfg
            for (const key in cfg) {
              db.set(key, (cfg as any)[key])
            }
            return resolve(cfg)
          } catch (e) {
            console.error({ msg: 'unhandled exception restoring from dynamodb', e: e })
            return reject(e)
          }
        }

        console.warn({
          msg:
            'fell through when restoring from dynamo.' +
            ' This is usually caused by an empty dynamodb table, such as on first run.' +
            ' However, if it happens frequently, then there is probably a bug in the code.'
        })
        return resolve({})
      }
    })
  })
}

// @ts-ignore TS6133
function restoreAsync() {
  return new Promise<db.Config>((resolve, reject) => {
    db.restore(DB_NAME, (err, raw) => {
      if (err) {
        return reject(err)
      }
      return resolve(raw)
    })
  })
}

// @ts-ignore TS6133
function backupAsync<TConfig>(cfg?: TConfig) {
  if (cfg) {
    for (const key in cfg) {
      db.set(key, (cfg as any)[key])
    }
  }

  return new Promise<void>(resolve => {
    db.backup(DB_NAME, () => resolve())
  })
}
