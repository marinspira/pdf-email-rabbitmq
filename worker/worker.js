import amqp from "amqplib";
import dotenv from "dotenv"
import { v4 as uuidv4 } from "uuid";
import path from "path";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import fs from "fs";
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config()

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';

async function generatePDF(users, filePath) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    doc.fontSize(20).text('User Report', { align: 'center' });
    doc.moveDown();
    users.forEach((user, i) => doc.text(`${i + 1}. ${user.name} - ${user.email}`));
    doc.end();

    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}

async function sendEmail(to, attachment) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'mariaferreira.developer@gmail.com',
      pass: process.env.APP_PASSWORD
    }
  });

  await transporter.sendMail({
    from: 'mariaferreira.developer@gmail.com',
    to,
    subject: 'PDF Report',
    text: 'Here is your PDF report.',
    attachments: [{ path: attachment }]
  });
}

async function waitForRabbitMQ(url, retries = 10, delay = 3000) {
  while (retries > 0) {
    try {
      const conn = await amqp.connect(url);
      console.log("RabbitMQ is ready.");
      return conn;
    } catch (err) {
      console.log(`Waiting for RabbitMQ... (${retries} retries left)`);
      await new Promise(res => setTimeout(res, delay));
      retries--;
    }
  }
  throw new Error("RabbitMQ connection failed after retries");
}


async function startWorker() {
  const conn = await waitForRabbitMQ(RABBITMQ_URL);

  const channel = await conn.createChannel();

  await channel.assertQueue('pdf_jobs', {
    durable: true,
    deadLetterExchange: '',
    deadLetterRoutingKey: 'pdf_dlq'
  });

  await channel.assertQueue('pdf_dlq', { durable: true });

  channel.prefetch(1);
  console.log('Worker listening for jobs...');

  channel.consume('pdf_jobs', async (msg) => {
    const job = JSON.parse(msg.content.toString());
    const filePath = path.join(__dirname, `report-${uuidv4()}.pdf`);

    try {
      await generatePDF(job.users, filePath);
      await sendEmail(job.email, filePath);
      console.log('Job done:', job.email);
      channel.ack(msg);
    } catch (err) {
      console.error('Job failed:', err.message);
      channel.nack(msg, false, false); // send to DLQ
    }
  });

  channel.consume('pdf_dlq', (msg) => {
    console.warn('DLQ received message:', msg.content.toString());
    channel.ack(msg); // optional: store for audit/log
  });
}

startWorker();
