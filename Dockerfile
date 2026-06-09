FROM python:3.11-slim

WORKDIR /app

# Atkarības (atsevišķi, lai cache strādā)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pārējais kods
COPY . .

# Datubāzes mape (tiks piesaistīta kā volume)
RUN mkdir -p /app/data
ENV DB_PATH=/app/data/tutor.db

EXPOSE 5000

# Viens worker + vairāki threads = SQLite nemet "database is locked"
CMD ["gunicorn", "--workers", "1", "--threads", "8", "--timeout", "180", "--bind", "0.0.0.0:5000", "app:app"]
