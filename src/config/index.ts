import {
  configure,
  initialiseConfig,
  defaultConfig,
  DefaultConfig,
  BaseConfig,
  DefaultParams
} from './setup'

export { BaseConfig as Config, DefaultParams }

export interface SetupConfig extends DefaultConfig {
  token: string
}

export function setup<TConfig extends {}>(config: TConfig & Partial<SetupConfig>) {
  if (setupCalled) {
    throw new Error('Setup has already been called')
  }

  setupCalled = true
  const { getter, setter } = configure<TConfig>()

  const initialConfig = { ...defaultConfig, ...(config as any) }

  // This is async, but we need to return the mutators synchronously
  initialiseConfig(initialConfig)

  _getter = getter as any
  _setter = setter as any

  return {
    getConfig: getter,
    setConfig: setter
  }
}

export function getConfig() {
  return _getter()
}

export function setConfig(key: keyof DefaultConfig, value: any) {
  return _setter(key, value)
}

let setupCalled = false

let _getter = (): BaseConfig => {
  throw new Error('Configuration not setup')
}

let _setter = (_key: keyof DefaultConfig, _value: any): Promise<BaseConfig> => {
  throw new Error('Configuration not setup')
}
