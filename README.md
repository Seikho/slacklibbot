# SlackLibBot
A Slack bot framework written in TypeScript

## Installation

```sh
> npm install slacklibbot --save
```

## Configuration API

### Configuration Defaults

```ts
// This can be overridden at any time
interface DefaultConfig {
  token: 'slack-bot-token',
  name: 'SlacklibBot',
  emoji: ':robot_face:',
  channel: 'general',
  timezone: 8
}
```

### configure
This returns an object with the getter and setter functions used to control your configuration.

```ts
// Signature
interface Configuration {
  setConfig: SetConfig // Async function to update your configuration
  getConfig: GetConfig // Sync function to retrieve your configuration
}
configure<YourConfig>(config: YourConfig & Partial<DefaultConfig>): Promise<Configuration>

/** ./config.ts */
import { configure } from 'slacklibbot'


// E.g.
export const config = configure({
  token: 'xoxb-1234-abc',
  myKey: 42,
  name: 'My Bot Name'
  // plus any overrides of the DefaultConfig
})
```


### getConfig
`DefaultParams` is intended as a helper objet for calling `postMessage`.
It contains the message options for the bot's username and emoji.

```ts
// Included in this framework
// Signature
interface DefaultParams {
  defaultParams: {
    icon_emoji: string
    username: string
    as_user: boolean
  }
}
function getConfig(): YourConfig & DefaultConfig & DefaultParams

/** ./my-module.ts (Sample module in your code) */
import { config } from './config'
const myConfig = config.getConfig()
```

### setConfig
```ts
// Signature
async function setConfig(key: keyof YourConfig & DefaultConfig, value: any): Promise<YourConfig & DefaultConfig>

/** ./another-module.ts (Sample module in your code) */
import { config } from './config'

async function doThing() {
  // Override a default
  await config.setConfig('emoji', ':thumbs_up:')

  // Set your own keys
  await config.setConfig('myKey', { foo: 'bar' })
}
```


## Commands API
Commands that you register are automatically added to the `help` response.

To call commands, you must mention the bot with the command and your parameters.
E.g. If the bot's username (configured via the Slack Bot customisation user interface) is `@mybot`:
```sh
> @mybot help
> @mybot set emoji :thumbs_up:
> @mybot set name Slackbot
```

### Built-in commands
```sh
> help
> get
> set
```

## Command Registration

### RegisterCallback
`SlackClient` and `Chat.Message` are from the package `'slacklib'`

```ts
type RegisterCallback = (bot: SlackClient, message: Chat.Message, config: Config, params: string[])
```

### register
```ts
function register(command: string, description: string, callback: RegisterCallback)

// Example
import { register } from 'slacklibbot'

register('my-command', 'This will appear when help is caled', (bot, msg, cfg, params) => {
  bot.postMessage({
    channel: msg.channel,
    text: `Message received!`,
    ...cfg.defaultParams // This is to apply the bot's username and emoji to its message
  }, )
})
```

## Helper functions

### readMessage
This allows you to write synchronous looking code that waits for a message

```ts
import { register, readMessage } from 'slacklibbot'

// Signature
// Users namespace is available from the library 'slacklib'
function register(bot: SlackClient, user: Users.User, timeoutMsg: number): Promise<string>

// Example
register('my-command', 'My command description', (bot, msg, cfg) => {
  const msgCfg = { channel: bot.channel, ...cfg.defaultParams }
  await bot.postMessage({ ...msgCfg, text: 'Please respond:' })

  const response = await readMessage(bot, msg.user, 10000)
  await bot.postMessage({ ...msgCfg, text: `Thanks for your response: ${response}` })
})

```