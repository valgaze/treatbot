/**
 * Google vision helper
 *
 * Concept: Take a photo, get labels, compare labels to "treats" available in treatbot
 * if a match, use that aas input
 *
 * To get a bearer token however...
 * 0) Do all prework (enable billing, APIs, etc): https://cloud.google.com/vision/docs/setup
 * 1) Use Gcloud CLI to create a token, ex $ cd ~/googlecli/bin && ./gcloud auth print-access-token
 * 2) Add secret to isolate, from repo run: $ npx wrangler secret put VISION_TOKEN
 *
 * ```ts
 *  import { vision } from './vision'
 *
 * {
 * keyword: '<@fileupload>',
 * async handler($bot, trigger: any) {
 *   // Special handler for file uploads
 *   const [fileUrl] = trigger.message.files || []
 *   const fileData = await $bot.getFile(fileUrl, {
 *     responseType: 'arraybuffer',
 *   })
 *   const { data } = fileData
 *   const inst = vision($bot.env.VISION_TOKEN)
 *   try {
 *     throw new Error('Throw until better solution in place')
 *     const res = await inst.detect(inst.toBase64(data))
 *
 *     const labels = res?.responses[0]?.labelAnnotations.map(
 *       ({ description }) => {
 *         return description
 *       }
 *     )
 *     $bot.send('look at all those labels!')
 *     $bot.sendJSON(labels)
 *   } catch (e) {
 *     $bot.send('Had some catastrophic error')
 *   }
 *  }
 * }
 * ```
 *
 *
 * @param url
 *
 *
 *
 * @param body
 * @param opts
 * @returns
 */

export const makeRequest = async (url: string, body: any, opts: any = {}) => {
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
      Authorization: `Bearer ${opts.token}`,
      ...additionalHeaders,
    },
  }
  if (opts.method === 'POST') {
    init.body = opts.raw ? body : JSON.stringify(body)
  }
  const response = await fetch(url, init)
  return response
}

/**
 * **REALLY FAST** arrayBuffer <> base64, without this approach
 * isolate could timeout
 * https://gist.github.com/jonleighton/958841
 * https://gist.github.com/jonleighton
 * Jon Leighton
 * https://jonleighton.name/
 * @param arrayBuffer
 *
 *
 * @returns string
 */
function base64ArrayBuffer(arrayBuffer: ArrayBuffer) {
  var base64 = ''
  var encodings =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

  var bytes = new Uint8Array(arrayBuffer)
  var byteLength = bytes.byteLength
  var byteRemainder = byteLength % 3
  var mainLength = byteLength - byteRemainder

  var a, b, c, d
  var chunk

  // Main loop deals with bytes in chunks of 3
  for (var i = 0; i < mainLength; i = i + 3) {
    // Combine the three bytes into a single integer
    chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]

    // Use bitmasks to extract 6-bit segments from the triplet
    a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18
    b = (chunk & 258048) >> 12 // 258048   = (2^6 - 1) << 12
    c = (chunk & 4032) >> 6 // 4032     = (2^6 - 1) << 6
    d = chunk & 63 // 63       = 2^6 - 1

    // Convert the raw binary segments to the appropriate ASCII encoding
    base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
  }

  // Deal with the remaining bytes and padding
  if (byteRemainder == 1) {
    chunk = bytes[mainLength]

    a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2

    // Set the 4 least significant bits to zero
    b = (chunk & 3) << 4 // 3   = 2^2 - 1

    base64 += encodings[a] + encodings[b] + '=='
  } else if (byteRemainder == 2) {
    chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]

    a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
    b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4

    // Set the 2 least significant bits to zero
    c = (chunk & 15) << 2 // 15    = 2^4 - 1

    base64 += encodings[a] + encodings[b] + encodings[c] + '='
  }

  return base64
}

export type DetectionResponse = {
  labelAnnotations: {
    mid: string
    description: string
    score: string
    topicality: string
  }[]
}
export type FullDetection = {
  responses: DetectionResponse[]
}
export class VisionHelper {
  private endpoint = 'https://vision.googleapis.com/v1/images:annotate'
  constructor(private token: string) {}

  toBase64(buffer: any) {
    return base64ArrayBuffer(buffer)
  }
  async detect(base64Image: string): Promise<FullDetection> {
    const body = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              maxResults: 10,
              type: 'LABEL_DETECTION',
            },
          ],
        },
      ],
    }
    const res = await makeRequest(this.endpoint, body, {
      token: this.token,
      method: 'POST',
    })
    const json = (await res.json()) as FullDetection
    return json
  }
}

export function vision(token: string) {
  return new VisionHelper(token)
}
