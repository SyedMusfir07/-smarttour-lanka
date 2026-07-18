FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY prisma ./prisma/
COPY src ./src/

RUN npx prisma generate

EXPOSE 4000

CMD ["sh", "-c", "npx prisma db push && npx tsx src/seed.ts && npx tsx src/index.ts"]
