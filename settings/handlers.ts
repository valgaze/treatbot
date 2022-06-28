import { BotHandler } from '../src/lib/payloads.types'
import { voiceflow, TransformedResponse } from './vf'

import { vision } from './vision'

// Secrets availble on $bot.env
export type BotEnvs = {
  VF_TOKEN: string
  BOT_TOKEN: string
  VISION_TOKEN: string
}
export const handlers: BotHandler<BotEnvs>[] = [
  {
    keyword: '<@catchall>',
    async handler($bot, trigger) {
      const userId = `${trigger.personId}_${trigger.message.roomId}`
      const inst = voiceflow.init($bot.env.VF_TOKEN, userId)
      const sessionKey = 'isRunning'
      const session = await inst.getData(sessionKey)

      const { text } = trigger
      const nonNLU = ['help', '$clear', 'location', 'healthcheck']

      let res: TransformedResponse[]
      if (nonNLU.includes(text)) {
        $bot.log('Use normal handling system')
      } else {
        // $bot.send('Session: ' + session)
        if (!session) {
          await inst.saveData(sessionKey, 1)
          res = (await inst.launch()) as TransformedResponse[]
        } else {
          res = await inst.send(text)
        }
        // Transform resonses to adaptive card, send follow-ups, etc
        inst.processRes($bot, res)
      }
    },
  },
  {
    keyword: '<@fileupload>',
    async handler($bot, trigger: any) {
      const USE_VISION = false
      if (USE_VISION) {
        const [fileUrl] = trigger.message.files || []
        const fileData = await $bot.getFile(fileUrl, {
          responseType: 'arraybuffer',
        })
        const { data } = fileData

        const inst = vision($bot.env.VISION_TOKEN)
        try {
          const res = await inst.detect(inst.toBase64(data))
          const labels = res?.responses[0]?.labelAnnotations.map(
            ({ description }) => {
              return description
            }
          )
          $bot.send('look at all those labels!')
          $bot.sendJSON(labels)
        } catch (e) {
          $bot.send('There was a catastrohic error with vision service')
        }
      } else {
        $bot.send(
          $bot
            .dangerCard({
              title: 'Vision is not enabled for this agent',
              subTitle:
                'The maintainer of this agent has not added vision to this agent yet',
              chips: ['I want ice cream'],
            })
            .setDetail(
              $bot
                .card()
                .setText('Other Resources')
                .setText(
                  '📚 Read **[The API Docs](https://github.com/valgaze/speedybot-hub/blob/deploy/api-docs/classes/BotRoot.md#class-botroott)**'
                )
                .setText(
                  '⌨️ See **[The source code for this agent](https://github.com/valgaze/treatbot/blob/deploy/settings/handlers.ts)**'
                )
                .setText(
                  '**[🍦 Talk to "Speedybot"](webexteams://im?email=speedybot@webex.bot)**'
                )
                .setText(
                  '**[🗣 Get help](webexteams://im?space=6d124c80-f638-11ec-bc55-314549e772a9)**'
                ),
              'Get Help🚨'
            )
        )
      }
    },
    hideHelp: true,
  },
  {
    keyword: 'help',
    handler($bot) {
      const help = $bot.generateHelp()
      const chips: (string | { label: string; keyword?: string })[] = help.map(
        ({ label }) => label
      )
      chips.push({ label: 'Try location', keyword: 'location' })
      $bot.send(
        $bot
          .card({
            title: 'Help commands',
            subTitle: `Best way to start-- say "I want ice cream" or "I want a large strawberry"`,
            table: help.map(({ label, helpText }, idx) => [
              String(idx),
              `${label}: ${helpText}`,
            ]),
            chips,
          })
          .setDetail(
            $bot
              .card()
              .setText('Other Resources')
              .setText(
                '📚 Read **[The API Docs](https://github.com/valgaze/speedybot-hub/blob/deploy/api-docs/classes/BotRoot.md#class-botroott)**'
              )
              .setText(
                '⌨️ See **[The source code for this agent](https://github.com/valgaze/treatbot/blob/deploy/settings/handlers.ts)**'
              )
              .setText(
                '**[🍦 Talk to "Speedybot"](webexteams://im?email=speedybot@webex.bot)**'
              )
              .setText(
                '**[🗣 Get help](webexteams://im?space=6d124c80-f638-11ec-bc55-314549e772a9)**'
              ),
            'Get Help🚨'
          )
      )
    },
    helpText: 'Show the user help information',
  },
  {
    keyword: 'location',
    async handler($bot, trigger) {
      $bot.locationAuthorizer(trigger)
    },
    helpText: 'Prompt the user to ask for permission questions',
  },
  {
    keyword: '$clear',
    async handler($bot, trigger) {
      $bot.clearScreen()
      const sessionId = `${trigger.personId}_${trigger.message.roomId}`
      const inst = voiceflow.init($bot.env.VF_TOKEN, sessionId)
      await inst.killAllState()
    },
    helpText: '(helper) clear the screen',
  },
  {
    keyword: 'healthcheck',
    handler($bot, trigger) {
      $bot.say('One card on the way...')
      // Adapative Card: https://developer.webex.com/docs/api/guides/cards
      const cardData = $bot
        .card({
          title: 'System is 👍',
          subTitle: 'If you see this card, everything is working',
          image:
            'https://raw.githubusercontent.com/valgaze/speedybot/master/docs/assets/chocolate_chip_cookies.png',
          url: 'https://www.youtube.com/watch?v=3GwjfUFyY6M',
          urlLabel: 'Take a moment to celebrate',
          table: [[`Bot's Date`, new Date().toDateString()]],
        })
        .setInput(`What's on your mind?`)
        .setData({ mySpecialData: { a: 1, b: 2 } })
        .setChoices(['option a', 'option b', 'option c'])

      $bot.send(cardData)
    },
    helpText: 'Sends an Adaptive Card with an input field to the user',
  },
  {
    keyword: '<@submit>',
    async handler($bot, trigger: any) {
      $bot.send(
        `Submission received! You sent us ${JSON.stringify(
          trigger.attachmentAction.inputs
        )}`
      )
    },
    hideHelp: true,
  },
]
