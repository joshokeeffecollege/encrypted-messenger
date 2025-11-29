
# **So far...**
### **Backend**
* Node.js + TypeScript (ESM + NodeNext)
* Express HTTP API
* SQLite database
* Prisma ORM with migrations
* User authentication:

    * Register new accounts
    * Secure password hashing using Argon2id
    * Login endpoint returning basic user info

### **Frontend**
* React (Vite + TypeScript)
* Register form
* Login form
* API client with error handling
* UI state for authenticated user

### **System**
* CORS configured for frontend ↔ backend development
* Hot reload workflow for server and client
* Ability to inspect database via Prisma Studio or WebStorm DB window

---
# **1. Clone the Repository**

```bash
git clone <your-repo-url>
cd fedsignal
```

---

# **2. Setup the Server**

```bash
cd server
npm install
```

### **Generate the Prisma client**

```bash
npx prisma generate
```

### **Apply database migrations**

```bash
npx prisma migrate dev --name init
```

This creates the SQLite DB at:

```
server/prisma/dev.db
```

### **Build the server**

```bash
npm run build
```

### **Start the server**

```bash
npm start
```

The server will run on:

```
http://localhost:5000
```

---

# **3. Setup the Client**

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

The client will start on:

```
http://localhost:5173
```

---

# **4. Development Workflow**

### **Backend (recommended)**

Terminal 1 – watch TypeScript build:

```bash
cd server
npm run build -- --watch
```

Terminal 2 – run compiled server with reload:

```bash
cd server
npm run dev
```

### **Frontend**

```bash
cd client
npm run dev
```

---

# **5. Testing the System**

### **Register a user**

Run the UI on: `http://localhost:5173`

---

# **6. Viewing the Database**

### **WebStorm built-in DB viewer**

1. View → Tool Windows → **Database**
2. Add → **Data Source → SQLite**
3. Choose: `server/prisma/dev.db`
4. Refresh to see latest rows

---

# **7. Environment Variables**

The server uses `.env` for configuration (if needed):

```
PORT=5000
```

SQLite does not require any additional environment variables.

---

# **8. Rebuilding From Scratch**

I've had to do this a couple of times...

```bash
cd server
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npx prisma generate
npx prisma migrate dev
npm run build
npm start
```

And for the client:

```bash
cd client
rm -rf node_modules package-lock.json
npm install
npm run dev
```