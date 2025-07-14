const express = require('express');
const amqp = require('amqplib');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

let channel;

async function connectRabbit() {
  const conn = await amqp.connect(RABBITMQ_URL);
  channel = await conn.createChannel();

  await channel.assertQueue('pdf_jobs', {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: 'pdf_dlq'
  });

  await channel.assertQueue('pdf_dlq', { durable: true });
  console.log('📦 RabbitMQ connected');
}

app.post('/generate', async (req, res) => {
  const { users, email } = req.body;

  if (!users || !email) {
    return res.status(400).json({ error: 'Missing users or email' });
  }

  const job = { users, email };
  channel.sendToQueue('pdf_jobs', Buffer.from(JSON.stringify(job)), {
    persistent: true
  });

  res.status(202).json({ message: 'Job queued' });
});

connectRabbit().then(() => {
  app.listen(3000, () => {
    console.log('🚀 API running on http://localhost:3000');
  });
});