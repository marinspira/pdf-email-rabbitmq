import express from 'express';
import amqp from 'amqplib';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
let channel;

async function waitForRabbitMQ(url, retries = 10, delay = 3000) {
  while (retries > 0) {
    try {
      const conn = await amqp.connect(url);
      console.log('RabbitMQ connected');
      return conn;
    } catch (err) {
      console.log(`⏳ Waiting for RabbitMQ... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      retries--;
    }
  }
  throw new Error('RabbitMQ connection failed after retries');
}

async function connectRabbit() {
  const conn = await waitForRabbitMQ(RABBITMQ_URL);
  channel = await conn.createChannel();

  await channel.assertQueue('pdf_jobs', {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: 'pdf_dlq'
  });

  await channel.assertQueue('pdf_dlq', { durable: true });
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

connectRabbit()
  .then(() => {
    app.listen(3000, () => {
      console.log('API running at http://localhost:3000');
    });
  })
  .catch(err => {
    console.error('Failed to start API:', err.message);
    process.exit(1);
  });
