import { BotRoot } from './../src/lib/bot'
export interface RootResponse {
  stack: { programID: string; nodeID: string }[]
  storage: {
    [key: string]: any
  }
  variables: {
    [key: string]: any
  }
}

export type FetchOpts = {
  method: string
  'content-type': string
  headers: {
    [key: string]: any
  }
  raw: boolean
}

export class VFHelper {
  private baseURL = 'https://general-runtime.voiceflow.com'
  private config = {
    tts: false,
    stripSSML: true,
    stopAll: true,
    excludeTypes: ['block', 'debug', 'flow', 'log'],
  }

  constructor(private token: string, private userId: string) {}

  async getData<T = any>(key?: string) {
    // https://general-runtime.voiceflow.com/state/user/steve
    const url = `${this.baseURL}/state/user/${this.userId}`
    const res = (await this.makeRequest(
      url,
      {},
      {
        method: 'GET',
      }
    )) as RootResponse
    const { variables = {} } = res
    if (key) {
      // full state
      return variables[key]
    } else {
      // variables or specific variable
      return res
    }
  }

  async deleteData<T = any>(key: string) {
    return this.saveData(key, null)
  }

  async saveData<T = any>(key: string, val: T) {
    // https://general-runtime.voiceflow.com/state/aabbccddeeffgg/steve/variables
    const url = `${this.baseURL}/state/user/${this.userId}/variables`
    const body = {
      [key]: val,
    }
    return this.makeRequest(url, body, {
      method: 'PATCH',
    })
  }

  async makeRequest<T = any>(
    url: string,
    body: any,
    opts: Partial<FetchOpts> = {}
  ): Promise<T> {
    const defaultConfig = {
      method: 'POST',
      'content-type': 'application/json;charset=UTF-8',
      raw: false,
    }
    const contentType = opts['content-type']
      ? opts['content-type']
      : defaultConfig['content-type']
    const additionalHeaders = opts.headers ? opts.headers : {}
    const init: {
      method: string
      headers: any
      body?: any
      [key: string]: any
    } = {
      method: opts.method ? opts.method : defaultConfig.method,
      headers: {
        'content-type': contentType,
        Authorization: this.token,
        ...additionalHeaders,
      },
    }
    if (
      init.method === 'POST' ||
      init.method === 'PATCH' ||
      opts.method === 'POST' ||
      opts.method === 'PATCH'
    ) {
      init.body = opts.raw ? body : JSON.stringify(body)
    }
    const response = await fetch(url, init)
    const json = await response.json()
    return json as T
  }

  public async processRes($bot: BotRoot, res: any) {
    for (let i = 0; i < res.length; i++) {
      const item = res[i]

      const { type, value } = item
      if (type === 'text') {
        await $bot.say(value)
      }

      if (type === 'choice') {
        $bot.log('<choice>', JSON.stringify(value))
        if (Array.isArray(value)) {
          await $bot.send($bot.card({ chips: value.map((item) => item.label) }))
        }
      }

      if (type === 'visual' && value) {
        const card = $bot.card({ image: value })
        await $bot.send(card)
      }
    }
  }

  public tidyResponse(
    response: (VFText | VFVisual | VFChoice)[]
  ): TransformedResponse[] {
    const responses: (
      | { type: TypeKeys; value: string }
      | { type: TypeKeys; value: { label: string; type: string }[] }
    )[] = []

    const choices: {
      type: TypeKeys
      value: { label: string; type: string }[]
    }[] = []
    response.forEach((item) => {
      const { type } = item

      if (item.type === 'text') {
        responses.push({ type, value: item.payload.message })
      }

      if (item.type === 'choice') {
        const buttons = item.payload.buttons.map((button) => {
          const { request } = button
          return {
            type: request.type,
            label: request.payload,
          }
        })
        //@ts-ignore
        choices.push({ type, value: buttons })
      }

      if (item.type === 'visual') {
        if (item.payload.visualType === 'image') {
          const { image } = item.payload
          responses.push({ type, value: image })
        }
      }
    })
    return responses.concat(choices)
  }

  public async launch(raw = false) {
    const url = `${this.baseURL}/state/user/${this.userId}/interact`
    const body = {
      action: {
        type: 'launch',
      },
      config: {
        tts: false,
        stripSSML: true,
        stopAll: true,
        excludeTypes: ['block', 'debug', 'flow'],
      },
    }
    const response = await this.makeRequest(url, body)
    if (raw) {
      return response
    }
    return this.tidyResponse(response)
  }

  public async send(message: string, payload = {}) {
    const data = {
      action: {
        type: 'text',
        payload: message,
      },
      config: this.config,
      ...payload,
    }
    const url = `${this.baseURL}/state/user/${this.userId}/interact`
    const response = await this.makeRequest(url, data)
    return this.tidyResponse(response)
  }

  public async killAllState() {
    const url = `${this.baseURL}/state/user/${this.userId}`
    await this.makeRequest(url, {}, { method: 'DELETE', raw: true })
    return true
  }

  public rando(): string {
    return `${Math.random().toString(36).slice(2)}`
  }
}

// todo: more response types, dialogflow?
export type TypeKeys = 'text' | 'choice' | 'visual'
export interface TransformedResponse {
  type: TypeKeys
  value: string | string[] | { label: string; type: string }[]
}

export interface VFVisual {
  visualType: string
  image: string
  device?: any
  dimensions: any
  canvasVisibility: string
}

export interface Base<T> {
  type: string
  payload: T
}
export interface VFText
  extends Base<{
    message: string
    slate: { id: string; content: { children: { text: string }[] } }
  }> {
  type: 'text'
}

export interface VFVisual
  extends Base<{
    visualType: string
    image: string
    device?: any
    dimensions: { width: number; height: number }
    canvasVisibility: string
  }> {
  type: 'visual'
}

export interface VFButton {
  name: string
  request: {
    type: string
    payload: {
      label: string
    }
  }
}
export interface VFChoice extends Base<{ buttons: VFButton[] }> {
  type: 'choice'
}

export type VFInteraction = VFText | VFVisual | VFChoice

export const voiceflow = {
  init(token: string, userId: string): VFHelper {
    return new VFHelper(token, userId)
  },
}
