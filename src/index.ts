export { setup } from './config'
export { readMessage } from './read'
export { start } from './start'
export * from './cmd'

// Register the built-in config commands
import './cmd/config'
import './cmd/help'
