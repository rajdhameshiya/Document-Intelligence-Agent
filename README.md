# Document Intelligence Agent - Prototype

## Setup

1. Add your OpenAI API key to `.env`:
   `OPENAI_API_KEY=your_key_here`
2. Install dependencies:
   `npm install --prefix server`
   `npm install --prefix client --legacy-peer-deps`
3. Start both servers:
   `npm run dev --prefix server`
   `npm start --prefix client`
4. Open http://localhost:3000

## Demo Flow

### Flow 1 - Document Intake
1. Go to `/intake`
2. Upload any PDF using the drag-and-drop widget
3. Watch the agent classify and extract fields
4. Review extracted fields and resolve flagged conflicts

### Flow 2 - BL Generation
1. Go to `/shipments/ship-002`
2. Click the `BL Draft` tab
3. Click `Generate BL Draft`
4. Review the generated BL
5. Apply a revision and approve

### Flow 3 - Manager Dashboard
1. Switch role to Manager or go to `/dashboard`
2. View at-risk shipments and exception queue
3. Review exec workload

## Notes

- Uses OpenAI GPT-4o when `OPENAI_API_KEY` is configured.
- Falls back to sample document text if extraction fails or no API key is present.
- Data is stored in `/data/*.json`; reset those files to `[]` to reseed on the next server start.
- The client dependency tree uses `react-scripts`, so npm may need `--legacy-peer-deps`.

## Deploying on Vercel

This repository includes `vercel.json` so Vercel can build and serve the React app from `client/build`.

For the frontend-only deployment:

- Framework preset: Other
- Build command: `npm install --prefix client --legacy-peer-deps && npm run build --prefix client`
- Output directory: `client/build`

The Express backend is not a long-running server on Vercel. For full API functionality, deploy the backend on Render/Railway and set this Vercel environment variable:

`REACT_APP_API_URL=https://your-backend-url`

## Telegram Bot Document Intake

The backend exposes a Telegram webhook at:

`https://your-backend-url/api/webhooks/telegram`

Required backend environment variables:

`TELEGRAM_BOT_TOKEN=your_botfather_token`
`PUBLIC_API_URL=https://your-backend-url`

Set the Telegram webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook?url=$PUBLIC_API_URL/api/webhooks/telegram"
```

Verify the webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

Usage:

1. Send a PDF, image, or document to your Telegram bot.
2. Optional: include a shipment reference in the caption, e.g. `SHIP-2024-001`.
3. The backend downloads the file, creates a document with channel `telegram`, and sends it through the same extraction queue.
