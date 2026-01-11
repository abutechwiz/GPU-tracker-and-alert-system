# GPU Tracker and Alert System

## Description

A robust, scalable GPU tracking and alert system built with [NestJS](https://github.com/nestjs/nest) and [BullMQ](https://docs.bullmq.io/). This system monitors various retailer websites for GPU availability and price changes, capable of handling distributed tasks with fault tolerance.

## Key Features

- **Background Job Processing**: Utilizes `BullMQ` (backed by Redis) for handling asynchronous tasks like polling and parsing.
- **Distributed Workers**:
    - **Retailer Worker**: Fetches HTML content from retailer pages.
    - **HTML Parser Worker**: Dedicated worker for parsing raw HTML to extract product details (Availability, Price).
- **Fault Tolerance**: Implements exponential backoff strategies for network resiliency.
- **Automated Scheduling**: Includes a `SchedulerService` running every 5 minutes to trigger polling jobs automatically.
- **Scalable**: Designed to handle multiple retailers and GPU models simultaneously.

## Tech Stack

- **Framework**: [NestJS](https://nestjs.com/) (Node.js)
- **Language**: TypeScript
- **Queue/Messaging**: [BullMQ](https://docs.bullmq.io/)
- **Database (Cache/Queue)**: [Redis](https://redis.io/)
- **HTTP Client**: Axios
- **Scheduling**: @nestjs/schedule

## Project Structure

- `src/app.module.ts`: Core application module configuring BullMQ and Scheduler.
- `src/retailer/`: Module handling the "Poll Retailer" logic.
    - `retailer.processor.ts`: Worker that fetches URLs and handles retry logic.
- `src/htmlParser/`: Module handling the HTML parsing logic.
    - `htmlParser.processor.ts`: Worker that processes raw HTML.
- `src/scheduler/`: Service that manages cron jobs (e.g., polling every 5 minutes).

## Prerequisites

- **Node.js** (latest LTS recommended)
- **Redis** server running locally on port `6379`

## Project setup

```bash
$ npm install
```

## Run the application

```bash
# development
$ npm run start

# watch mode (recommended for dev)
$ npm run start:dev

# production mode
$ npm run start:prod
```

## License

[MIT licensed](LICENSE)
