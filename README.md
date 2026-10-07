# GPU Tracker and Alert System

## Description

A robust, scalable GPU tracking and alert system built with [NestJS](https://github.com/nestjs/nest) and [BullMQ](https://docs.bullmq.io/). It polls retailer product pages, extracts price and availability, remembers the last known state of every product, and sends an alert when a GPU comes back in stock, drops in price or reaches your target price.

## Key Features

- **Background Job Processing**: `BullMQ` (backed by Redis) queues for polling, parsing, alert evaluation and notification delivery.
- **Distributed Workers**:
    - **Retailer Worker**: Fetches one retailer page per job, so a failing retailer only retries itself.
    - **HTML Parser Worker**: Extracts title, price, currency and availability using JSON-LD structured data, Open Graph / microdata tags, optional per-retailer CSS selectors, and text heuristics as a fallback.
    - **Alert Worker**: Compares each result with the last known state and raises alerts only on changes.
    - **Notification Worker**: Delivers each alert to each channel as its own job with independent retries.
- **Alerts**: `BACK_IN_STOCK`, `PRICE_DROP` (above a configurable % threshold) and `TARGET_PRICE_REACHED`.
- **Notification channels**: application log (always on), generic JSON webhook, Discord, Slack and Telegram.
- **Fault Tolerance**: Exponential backoff for fetching and for notifications. Pages that can't be parsed never overwrite known state or cause duplicate alerts.
- **Automated Scheduling**: A BullMQ job scheduler polls every tracker on `POLL_CRON` (every 5 minutes by default). The schedule is stored in Redis, so running several instances does not cause duplicate polls.
- **Configurable**: Tracked GPUs and retailers live in a JSON file that is re-read on every poll, so you can edit it without restarting.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: TypeScript
- **Queue/Messaging**: [BullMQ](https://docs.bullmq.io/)
- **Database (Cache/Queue/State)**: [Redis](https://redis.io/)
- **HTTP Client**: Axios
- **HTML Parsing**: [cheerio](https://cheerio.js.org/)

## How it works

```
BullMQ scheduler (POLL_CRON)
  └─ retailer-queue: poll_all ── fans out ──▶ poll_retailer (one per tracker × retailer)
                                                  │ fetch HTML
                                                  ▼
                                   html-parser-queue: parse_html
                                                  │ price / availability
                                                  ▼
                                   alert-queue: evaluate_snapshot ◀─▶ Redis (last known state)
                                                  │ alerts
                                                  ▼
                                   notification-queue: send_notification (one per alert × channel)
```

## Project Structure

- `src/app.module.ts`: Root module wiring config, BullMQ, Redis state and workers.
- `src/app.controller.ts`: REST API.
- `src/config/`: Environment-based configuration (`AppConfig`).
- `src/trackers/`: Loads and validates the trackers file.
- `src/scheduler/`: Registers the recurring poll schedule.
- `src/retailer/`: Poll fan-out (`retailer.service.ts`) and the page-fetching worker.
- `src/htmlParser/`: Parsing worker and the pure `product-parser.ts`.
- `src/alerts/`: Alert rules (`alert-evaluator.ts`), alert worker, notification worker and notifiers.
- `src/state/`: Redis-backed storage for product snapshots and alert history.
- `config/trackers.example.json`: Example trackers file.

## Prerequisites

- **Node.js** 22 or later
- **Redis** server (`docker compose up -d` starts one on port `6379`)

## Project setup

```bash
$ npm install
$ cp .env.example .env                                  # optional, edit as needed
$ cp config/trackers.example.json config/trackers.json  # then edit it
```

### Configuring trackers

`config/trackers.json` (or the file named by `TRACKERS_FILE`) contains an array of trackers, or `{ "trackers": [...] }`:

```json
{
  "trackers": [
    {
      "gpuModel": "RTX 4090",
      "targetPrice": 160000,
      "enabled": true,
      "retailers": [
        { "name": "MDComputers", "url": "https://mdcomputers.in/product/..." },
        {
          "name": "PrimeABGB",
          "url": "https://www.primeabgb.com/online-price-reviews-india/...",
          "selectors": {
            "price": ".summary .price .amount",
            "availability": ".summary .stock",
            "inStockText": ["in stock"],
            "outOfStockText": ["out of stock", "sold out"]
          }
        }
      ]
    }
  ]
}
```

- `url` should be a **product page** (not a home or search page).
- `targetPrice` (optional) triggers `TARGET_PRICE_REACHED` alerts.
- `selectors` (optional) are only needed when a retailer doesn't publish structured data. Selectors take precedence over everything else. If a page can't be parsed, the parser worker logs a warning suggesting you add them.
- Set `"enabled": false` to pause a tracker.

### Environment variables

`.env` is loaded automatically if present. See [.env.example](.env.example).

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP port |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` / `REDIS_DB` | `localhost` / `6379` / – / `0` | Redis connection |
| `POLL_CRON` | `*/5 * * * *` | Polling schedule |
| `TRACKERS_FILE` | `config/trackers.json` | Trackers file path |
| `HTTP_TIMEOUT_MS` | `15000` | Page fetch timeout |
| `HTTP_USER_AGENT` | desktop Chrome UA | User-Agent for fetching pages |
| `PRICE_DROP_THRESHOLD_PERCENT` | `1` | Minimum drop for a `PRICE_DROP` alert |
| `ALERT_WEBHOOK_URL` | – | POST the alert JSON to this URL |
| `DISCORD_WEBHOOK_URL` | – | Discord channel webhook |
| `SLACK_WEBHOOK_URL` | – | Slack incoming webhook |
| `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` | – | Telegram bot notifications |

## Run the application

```bash
# development
$ npm run start

# watch mode (recommended for dev)
$ npm run start:dev

# production mode
$ npm run build && npm run start:prod
```

## API

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Liveness check |
| `GET` | `/trackers` | Trackers loaded from the trackers file |
| `GET` | `/snapshots` | Latest known price/availability per product |
| `GET` | `/alerts?limit=50` | Most recent alerts (newest first) |
| `POST` | `/poll/all` | Poll every enabled tracker now |
| `POST` | `/poll` | Ad-hoc poll; body is a single tracker (`{ "gpuModel", "targetPrice?", "retailers": [{ "name", "url", "selectors?" }] }`) |

```bash
curl -X POST localhost:3000/poll -H 'content-type: application/json' \
  -d '{"gpuModel":"RTX 4090","retailers":[{"name":"MDComputers","url":"https://mdcomputers.in/product/..."}]}'
```

## Tests and linting

```bash
$ npm test            # unit tests
$ npm run lint:check  # eslint + prettier
```

## License

[MIT licensed](LICENSE)
