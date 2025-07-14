# 📨 PDF Generation & Emailing System with Node.js, RabbitMQ, Docker & DLQ

This project provides a scalable and robust system for generating dynamic PDF reports and sending them via email, using:

- **Node.js**
- **RabbitMQ** (with Dead Letter Queue support)
- **Docker & Docker Compose**
- **Nodemailer**
- **PDFKit**

---

## 📦 Features

- REST API to accept PDF generation requests
- Background processing via RabbitMQ
- Dead Letter Queue (DLQ) support for failed jobs
- PDF generation using `pdfkit`
- Email sending via `nodemailer` (supports Gmail or other SMTP providers)
- Fully containerized with Docker

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/marinspira/pdf-email-rabbitmq.git
cd pdf-email-rabbitmq
```

### 2. Configure Environment
Edit email credentials in worker/worker.js or set environment variables securely. For Gmail, use an App Password.

### 3. Run the System
```bash
docker-compose up --build
```

## Services started:

📮 RabbitMQ: localhost:5672

📊 RabbitMQ UI: http://localhost:15672 (user: guest / pass: guest)

🌐 REST API: http://localhost:3000

## Using the API
POST /generate
Send a JSON payload with user data and recipient email.

Request
```bash
{
  "email": "recipient@example.com",
  "users": [
    { "name": "Alice", "email": "alice@example.com" },
    { "name": "Bob", "email": "bob@example.com" }
  ]
}
```

## CURL Example
```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d @data.json
```

## 🪦 Dead Letter Queue (DLQ)
If a job fails (email error), it is routed to the pdf_dlq queue.

Messages can be viewed in the RabbitMQ UI.

You can later reprocess or log them from this queue.

