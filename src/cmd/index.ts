import { getConfig, Config } from '../config'
import { SlackClient, Chat } from 'slacklib'

// Register the built-in config commands
import './config'
import './help'

export type CommandListener = {
  desc: string
  callback: (bot: SlackClient, message: Chat.Message, config: Config, params: string[]) => void
}

const listeners: { [command: string]: CommandListener } = {}

export function register(command: string, desc: string, callback: CommandListener['callback']) {
  listeners[command] = { desc, callback }
}

export async function dispatch(bot: SlackClient, msg: Chat.Message, text: string) {
  const cfg = getConfig()
  const [cmd, ...params] = text.trim().split(' ')
  if (text === '') {
    await dispatch(bot, msg, 'first')
    return
  }

  if (!listeners[cmd]) {
    await bot.postMessage({
      channel: msg.channel,
      text: `Unrecognized command: *${cmd}*. Type @${bot.self.name} help for more information.`,
      ...cfg.defaultParams
    })

    const user = bot.users.find(user => user.id === msg.user)
    console.error(`[${user!.name}/${msg.type}] Unrecognized command: ${cmd}: ${msg.text}`)
    return
  }

  const user = bot.users.find(user => user.id === msg.user)
  console.log(`User: ${user!.name} | Cmd: ${cmd} | Params: ${params}`)
  listeners[cmd].callback(bot, msg, cfg, params)
}

export function getDescriptions() {
  const commands = Object.keys(listeners).map(key => ({ command: key, desc: listeners[key].desc }))
  return commands
}
