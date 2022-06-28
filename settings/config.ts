import { voiceflow } from './vf'

// Root config-- locales, validation, location handler, etc
export const config: SpeedyConfig = {
  token: 'placeholder', // 🚨 Given our infra, this will be replaced with BOT_TOKEN secret using with wrangler cli/github secrets
  locales: {
    es: {
      greetings: {
        welcome: 'hola!!',
      },
    },
    cn: {
      greetings: {
        welcome: '你好',
      },
    },
  },
  async validate(request) {
    /*
     *  Here could run validation for webook secret, ex
     *  Ex. Register webhook with a secret: $ npm init speedybot webhook create -- -t bot_token_here -w https://speedybot-hub.username.workers.dev -s secret_here
     *  https://github.com/webex/SparkSecretValidationDemo
     *  https://developer.webex.com/blog/using-a-webhook-secret
     *  https://developer.webex.com/blog/building-a-more-secure-bot
     *  ex
     *  const signature = request.headers.get('X-Spark-Signature')
     *  const json = await request.json()
     *  // if valid return { proceeed: true}
     *
     **/
    return { proceed: true }
  },
  async location($bot: LocationAwareBot) {
    try {
      const userId = `${$bot.meta.personId}_${$bot.meta.roomId}`

      const inst = voiceflow.init($bot.env.VF_TOKEN, userId)
      const sessionKey = 'isRunning'
      const session = await inst.getData(sessionKey)

      const { city, timezone, country, postalCode } = $bot.location
      await inst.saveData('city', city)
      await inst.saveData('timezone', timezone)
      await inst.saveData('country', country)
      await inst.saveData('postal', postalCode)

      const res = await inst.launch(session)
      inst.processRes($bot, res)

      if (res && res.length === 0) {
        // fallback if no reply
        const res = await inst.launch(session)
        inst.processRes($bot, res)
      }
    } catch (e) {
      const card = $bot
        .dangerCard({
          title:
            'It appears there was some type of error with the location service',
          subTitle:
            'Try your request again or start over by saying "I want ice cream"',
        })
        .setChips(['I want ice cream'])
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
      $bot.send(card)
    }
  },
  debug: true,
  fallbackText:
    'Sorry, it does not appear your client supports rendering cards',
}

import { SpeedyConfig, LocationAwareBot } from '../src/lib/'
