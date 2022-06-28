# 🏖 `speedybot hub` super-fast "no-ops" conversation design infrastructure

```
╔═╗ ╔═╗ ╔═╗ ╔═╗ ╔╦╗ ╦ ╦ ╔╗  ╔═╗ ╔╦╗
╚═╗ ╠═╝ ║╣  ║╣   ║║ ╚╦╝ ╠╩╗ ║ ║  ║
╚═╝ ╩   ╚═╝ ╚═╝ ═╩╝  ╩  ╚═╝ ╚═╝  ╩ HUB

tl:dr; serverless chat that actually works
```

See **[quickstart.md](https://github.com/valgaze/treatbot/blob/deploy/quickstart.md)** on how to get up and running fast

📚 [API Docs](https://github.com/valgaze/speedybot-hub/blob/deploy/api-docs/modules.md)

## Treatbot

Order treats-- say "I want icecream", take a photo, or say the magic keyword "location"

- Treatbot is an agent that lives on V8 Isolates & powered by **[speedybot-hub](https://github.com/valgaze/speedybot-hub)**

- Video: **[https://www.youtube.com/watch?v=3rPgkuLVdb8](https://www.youtube.com/watch?v=3rPgkuLVdb8)**

The era of manually writing lots of "handlers" or matching text with RegEx's is coming to an end. In the futrue there will be far fewer "keyword" handlers and instead deeper integration with 3rd-party conversational ai tooling.

## Credential Checklist

1. BOT_TOKEN: Bot access token, if you don't have one make one: https://developer.webex.com/my-apps/new
2. VF_TOKEN: Start a project in voiceflow, get the token
3. Weather API key: https://openweathermap.org/guide
