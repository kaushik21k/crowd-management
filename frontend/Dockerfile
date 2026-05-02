FROM node:18-alpine
WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci --silent

COPY frontend/ ./

ENV HOST 0.0.0.0
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
