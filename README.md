# Data Ingestion API Service

A backend service that ingests JSON data from AWS S3 buckets, stores it in MongoDB, and provides a unified API for querying.

## Features

- Ingest JSON data from S3 buckets
- Efficient handling of large files with streaming
- Store data in MongoDB with a flexible schema
- Query data with filtering and pagination
- Manual data refresh via API endpoint

## Requirements

- Node.js v22+
- MongoDB (can be run via Docker)
- Docker (optional, for running MongoDB)

## Quick Start Guide

### Setup in 3 Steps

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Run the Setup Script

This will create a basic .env file and start MongoDB in Docker:

```bash
chmod +x setup.sh
./setup.sh
```

#### 3. Start the Application

```bash
npm run start:dev
```

The application will now be running at http://localhost:3000

## API Endpoints

### Query Data
```
GET /api/data
```

Supports parameters:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)
- Any field name - Filter by field value
- Range filters: `field_min` and `field_max` for numeric ranges

Example: `/api/data?city=London&price_min=100&price_max=500&page=1&limit=20`

### Trigger Data Ingestion
```
POST /api/data/ingest
```
Manually trigger data ingestion from all sources.

```
POST /api/data/ingest/source1
```
Trigger ingestion from a specific source.
```