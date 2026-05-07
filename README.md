## Setup

Install dependencies:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

Create the database:

```bash
cd server
npx prisma db push
```

## Run

Start the server:

```bash
npm run server
```

In a second terminal, start the desktop client:

```bash
npm run dev
```
