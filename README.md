
# Setup

1) Install server dependencies and set up the database
```bash
cd server
npm install
npx prisma db push   # create SQLite schema
npm run build
PORT=5001 npm start  # or omit PORT to use 5000
```

2) Install client dependencies and run Vite
```bash
cd client
npm install
npm run dev
```

3) Open the app
- API: `http://localhost:5001` (or `:5000` if you didn’t override PORT)
- UI:  `http://localhost:5173`
