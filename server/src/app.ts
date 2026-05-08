import { createApp } from "./app/create-app.js";

const PORT = process.env.PORT || 5001;
const serverUrl = process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${PORT}`;
const HOST = "127.0.0.1";

createApp().listen(Number(PORT), HOST, () => {
  console.log(`Server running on ${serverUrl}`);
});
