FROM node:20-alpine AS builder

WORKDIR /app

# Копируем package файлы
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Собираем backend
WORKDIR /app/backend
RUN npm run build

# Собираем frontend
WORKDIR /app/frontend
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Устанавливаем зависимости для production
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install --production --workspace=backend

# Копируем собранный backend
COPY --from=builder /app/backend/dist ./backend/dist

# Копируем собранный frontend в backend для раздачи статики
COPY --from=builder /app/frontend/dist ./frontend/dist

# Создаем директорию для базы данных и логов
RUN mkdir -p /app/data /app/backend/logs

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/app/data/finance.db

EXPOSE 3001

CMD ["node", "backend/dist/index.js"]
