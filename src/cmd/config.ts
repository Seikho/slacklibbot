import { register } from './'
import { getConfig, setConfig } from '../config'

export const setableKeys = {
  name: 'Bot display name. Default: `SlacklibBot`',
  emoji: 'Bot emoji. Must be a default emoji. Default: `:robot_face:`',
  channel: 'Standup channel. Default: `general`',
  timezone: 'Timezone the bot should operate in. Default: `8`',
  debug: 'Enable debug mode. Default: `false`'
}

type ValidKey = keyof typeof setableKeys
const keys = Object.keys(setableKeys) as ValidKey[]

register(
  'set',
  `Update configuration. Available keys: ${keys.join(
    ', '
  )}.\n Usage: set [key] [...value].\n For info on the keys, use \`help\` with no parameters.`,
  async (bot, message, config, params) => {
    const key = params[0] as ValidKey
    const values = params.slice(1)
    const value = values.join(' ')

    if (!key || !value) {
      await bot.postMessage({
        channel: message.channel,
        text: `No ${!!key ? 'value' : 'key'} provided.\n${getHelpMessage()}`,
        ...config.defaultParams
      })
      return
    }

    if (key in setableKeys === false) {
      await bot.postMessage({
        channel: message.channel,
        text: `Invalid configuration key.\n${getHelpMessage()}`,
        ...config.defaultParams
      })
      return
    }

    try {
      const newConfig = await setConfig(key, value)
      await bot.postMessage({
        channel: message.channel,
        text: `Successfully updated *${key}*`,
        ...newConfig.defaultParams
      })
    } catch (ex) {
      await bot.postMessage({
        channel: message.channel,
        text: `${ex.message}\n${getHelpMessage()}`,
        ...config.defaultParams
      })
    }
  }
)

register('get', `Get the value of a configuration key`, async (bot, message, config, params) => {
  const key = params[0]
  const additionalKeys = Object.keys(config).filter(key => {
    return key !== 'token' && key !== 'defaultParams'
  })

  const availableKeys = Object.keys(setableKeys).concat(...additionalKeys)
  if (availableKeys.includes(key)) {
    const value = JSON.stringify((getConfig() as any)[key], null, 2)
    bot.postMessage({
      channel: message.channel,
      text: `*${key}*:\n\`\`\`\n${value}\n\`\`\``,
      ...config.defaultParams
    })
    return
  }

  await bot.postMessage({
    channel: message.channel,
    text: `Available keys: ${availableKeys}`,
    ...config.defaultParams
  })
})

function getHelpMessage() {
  const lines: string[] = []
  for (const key in setableKeys) {
    lines.push(`*${key}*: ${(setableKeys as any)[key]}`)
  }
  return lines.join('\n')
}
