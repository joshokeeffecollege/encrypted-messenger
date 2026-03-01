## Prerequisites

- Node.js & npm

## Install & Run

**1. Server**

```bash
cd server
npm install
npx prisma db push
npm run build
npm start
```

**2. Client**

```bash
cd client
npm install
npm run dev
```

**3. Open the app**

- UI: `http://localhost:5173`
- API: `http://localhost:5001`

## Environment Variables

Create a `server/.env` file to override defaults:

```env
PORT=5001
SESSION_SECRET=change-me-in-production
```
