export { setup } from './config'
export { readMessage } from './read'
export { start } from './start'
export * from './cmd'
export * from 'slacklib'

// Register the built-in config commands
import './cmd/config'
import './cmd/help'
