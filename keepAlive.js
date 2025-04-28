// keepAlive.js
import express from 'express';

export function keepAlive() {
  const app = express();
  app.get('/', (req, res) => res.send('Bot is Running!'));
  app.listen(3000, () => console.log('Server is ready.'));
}
