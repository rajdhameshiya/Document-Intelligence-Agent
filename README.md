# Document Intelligence Agent — Prototype

## Setup

1. Clone the repository
2. Add your OpenAI API key to `.env`:
   OPENAI_API_KEY=your_key_here
3. Install dependencies:
   cd server && npm install
   cd client && npm install
4. Start both servers:
   cd server && npm run dev     # Runs on port 3001
   cd client && npm start       # Runs on port 3000
5. Open http://localhost:3000

## Demo Flow

### Flow 1 — Document Intake
1. Go to /intake
2. Upload any PDF using the drag-and-drop widget
3. Watch the agent classify and extract fields
4. Review extracted fields and resolve any flagged exceptions

### Flow 2 — BL Generation
1. Go to /shipments/ship-002 (all documents received)
2. Click BL Draft tab
3. Click Generate BL Draft
4. Review the generated BL
5. Apply a revision and approve

### Flow 3 — Manager Dashboard
1. Switch role to Manager (top right)
2. Go to /dashboard
3. View at-risk shipments and exception queue

## Notes
- Uses OpenAI GPT-4o for field extraction. Requires a valid API key.
- Falls back to sample document text if PDF extraction fails.
- Data is stored in /data/*.json files. Delete these to reset.
