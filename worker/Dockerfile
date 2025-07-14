FROM node:18
WORKDIR /pdf-generator
COPY . .
RUN npm install
CMD ["node", "worker.js"]