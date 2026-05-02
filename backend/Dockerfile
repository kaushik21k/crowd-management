FROM python:3.11-slim
WORKDIR /app

# system deps for pillow and psycopg2
RUN apt-get update && apt-get install -y gcc libpq-dev libjpeg-dev zlib1g-dev && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY backend/ /app/

ENV PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
