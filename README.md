# FaceVector Engine

A production-ready face recognition and vector similarity search engine. Built with Node.js/TypeScript, this API provides a two-step workflow for face detection, customer enrollment, and recognition using state-of-the-art ArcFace embeddings, RetinaFace detection, and PostgreSQL pgvector for efficient similarity search.

## Features

- ✅ **Face Detection** - Detect faces with 5 facial landmarks using RetinaFace ResNet50
- ✅ **Face Enrollment** - Enroll customers with face embeddings for recognition
- ✅ **Face Recognition** - Identify customers by searching similar face embeddings
- ✅ **Multipart Upload** - Upload images as files (PNG, JPG, WEBP) with automatic scaling
- ✅ **Two-Step Workflow** - Detect faces first, then enroll or recognize them
- ✅ **Vector Similarity Search** - PostgreSQL pgvector with optimized ivfflat indexing
- ✅ **512-dim Embeddings** - ArcFace ResNet100 for high-accuracy face recognition
- ✅ **Docker Support** - Easy deployment with Docker Compose
- ✅ **TypeScript** - Fully typed codebase

## Architecture Overview

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        USER[User/Application]
    end

    subgraph API["API Server (Express + TypeScript)"]
        DETECT[POST /faces/detect<br/>Detect & Store Faces]
        ENROLL[POST /faces/enroll<br/>Enroll Customer]
        RECOGNIZE[POST /faces/recognize<br/>Recognize Customer]
        GET[GET /faces/:face_id<br/>Get Face Image]
    end

    subgraph Models["AI Models (ONNX Runtime)"]
        RETINAFACE[RetinaFace ResNet50<br/>Face Detection]
        ARCFACE[ArcFace ResNet100<br/>512-dim Embeddings]
    end

    subgraph Storage["Storage Layer"]
        DETECTED[(detected_faces table<br/>Face metadata)]
        ENROLLED[(enrolled_customers table<br/>Vector embeddings)]
        MINIO[MinIO S3<br/>Object Storage]
    end

    USER -->|Upload Image| DETECT
    DETECT -->|Detect Faces| RETINAFACE
    RETINAFACE -->|Bounding Boxes| DETECT
    DETECT -->|Store Metadata| DETECTED
    DETECT -->|Store Images| MINIO
    DETECT -->|face_id| USER

    USER -->|face_id + customer_info| ENROLL
    ENROLL -->|Read Face| MINIO
    ENROLL -->|Generate Embedding| ARCFACE
    ARCFACE -->|512-dim Vector| ENROLL
    ENROLL -->|Store| ENROLLED

    USER -->|face_id| RECOGNIZE
    RECOGNIZE -->|Read Face| MINIO
    RECOGNIZE -->|Generate Embedding| ARCFACE
    RECOGNIZE -->|Vector Search| ENROLLED
    ENROLLED -->|Matched Customers| RECOGNIZE
    RECOGNIZE -->|Results| USER

    USER -->|face_id| GET
    GET -->|Read| MINIO
    MINIO -->|Image| USER

    style RETINAFACE fill:#e1f5ff
    style ARCFACE fill:#e1f5ff
    style DETECTED fill:#fff4e1
    style ENROLLED fill:#fff4e1
    style MINIO fill:#ffe1f5
```

## Requirements

- Node.js 24+
- Docker + Docker Compose
- PostgreSQL with pgvector extension

## Quick Start

### Local Development

```bash
# Install dependencies
make install

# Download ONNX models
make models

# Make scripts executable
make chmod-scripts

# Start PostgreSQL database
make db

# Run the API locally
make run
```

### Docker Compose

```bash
# Build and start everything
make up

# Or with Docker Compose directly
docker compose up --build
```

- API runs on `http://localhost:3000/api`
- Postgres runs on `localhost:5432` (DB: face_db)

## API Endpoints

### 1. Detect Faces

Detect all faces in an uploaded image, store face crops and metadata, and return face IDs.

**POST** `/api/faces/detect`

**Request:** Multipart form-data
- `file` (required): Image file (PNG, JPG, WEBP, max 10MB)
- `identifier` (optional): Client-provided identifier for tracking

```bash
# Using curl
curl -X POST http://localhost:3000/api/faces/detect \
  -F "file=@examples/face1.jpeg" \
  -F "identifier=customer_123"

# Using script
./scripts/faces-detect.sh examples/face1.jpeg customer_123
```

**Response:**
```json
[
  {
    "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "position": {
      "x": 450,
      "y": 300,
      "width": 600,
      "height": 850
    },
    "confidence": 0.998,
    "file_name": "a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg"
  }
]
```

### 2. Get Face Image

Retrieve a stored face image by its face_id.

**GET** `/api/faces/:face_id`

```bash
# Using curl
curl -X GET http://localhost:3000/api/faces/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  -o face.jpg

# Using script (saves to output/)
./scripts/faces-get-image.sh a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:** Binary JPEG image

### 3. Enroll Customer

Enroll a customer by associating a detected face with customer information and generating an embedding.

**POST** `/api/faces/enroll`

**Request:** JSON
- `face_id` (required): UUID from `/faces/detect`
- `customer_identifier` (required): Unique customer identifier
- `customer_name` (optional): Customer's name
- `customer_metadata` (optional): Additional metadata as JSON

```bash
# Using curl
curl -X POST http://localhost:3000/api/faces/enroll \
  -H "Content-Type: application/json" \
  -d '{
    "face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "customer_identifier": "CUST001",
    "customer_name": "John Doe",
    "customer_metadata": {"age": 30, "membership": "gold"}
  }'

# Using script
./scripts/faces-enroll.sh a1b2c3d4-e5f6-7890-abcd-ef1234567890 CUST001 "John Doe"
```

**Response:**
```json
{
  "customer_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
  "customer_identifier": "CUST001",
  "customer_name": "John Doe",
  "created_at": "2024-12-02T10:30:00.000Z"
}
```

### 4. Recognize Face

Recognize a customer by searching for similar enrolled face embeddings.

**POST** `/api/faces/recognize`

**Request:** JSON
- `face_id` (required): UUID from `/faces/detect`

```bash
# Using curl
curl -X POST http://localhost:3000/api/faces/recognize \
  -H "Content-Type: application/json" \
  -d '{"face_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"}'

# Using script
./scripts/faces-recognize.sh a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

**Response:**
```json
[
  {
    "customer_id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "customer_identifier": "CUST001",
    "customer_name": "John Doe",
    "confidence_score": 0.9856
  },
  {
    "customer_id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
    "customer_identifier": "CUST002",
    "customer_name": "Jane Smith",
    "confidence_score": 0.7234
  }
]
```

Results are sorted by confidence score (descending), returns top 10 matches.

## Management Endpoints

Administrative endpoints for listing and managing detected faces and enrolled customers.

### List Detected Faces

**GET** `/api/management/faces?limit=50&offset=0`

Returns paginated list of all detected faces with metadata.

```bash
./scripts/management-list-faces.sh
```

### List Enrolled Customers

**GET** `/api/management/customers?limit=50&offset=0`

Returns paginated list of all enrolled customers.

```bash
./scripts/management-list-customers.sh
```

### Get Customer Details

**GET** `/api/management/customers/:customer_id`

Returns full customer details including face metadata.

```bash
./scripts/management-get-customer.sh <customer_id>
```

### Get Statistics

**GET** `/api/management/stats`

Returns database statistics including orphaned faces count.

```bash
./scripts/management-stats.sh
```

**Response:**
```json
{
  "detected_faces": 10,
  "enrolled_customers": 5,
  "orphaned_faces": 5
}
```

### Delete Orphaned Faces

**DELETE** `/api/management/faces/orphaned`

Deletes all orphaned faces (faces not enrolled with any customer) to free up storage space. This includes removing both database records and S3 images.

```bash
./scripts/management-delete-orphaned.sh
```

**Response:**
```json
{
  "message": "Successfully deleted 5 orphaned face(s)",
  "deleted_count": 5,
  "failed_count": 0,
  "deleted_faces": [
    {
      "face_id": "...",
      "identifier": "...",
      "s3_keys": {
        "original": "originals/...",
        "face": "faces/..."
      }
    }
  ]
}
```

### Delete Specific Face

**DELETE** `/api/management/faces/:face_id`

Deletes a specific face and its S3 images (only if not enrolled with any customer).

```bash
./scripts/management-delete-face.sh <face_id>
```

### Delete Customer

**DELETE** `/api/management/customers/:customer_id`

Deletes an enrolled customer record.

```bash
./scripts/management-delete-customer.sh <customer_id>
```

## Example Workflow

```bash
# 1. Detect faces in an image
./scripts/faces-detect.sh examples/face1.jpeg CUSTOMER_001
# Response: [{"face_id": "abc-123...", ...}]

# 2. Enroll the customer
./scripts/faces-enroll.sh abc-123... CUSTOMER_001 "John Doe"
# Response: {"customer_id": "xyz-789...", ...}

# 3. Later, detect face in new image
./scripts/faces-detect.sh examples/face_new.jpeg
# Response: [{"face_id": "def-456...", ...}]

# 4. Recognize the customer
./scripts/faces-recognize.sh def-456...
# Response: [{"customer_identifier": "CUSTOMER_001", "confidence_score": 0.98, ...}]

# 5. Retrieve the original face image
./scripts/faces-get-image.sh abc-123...
# Saves image to: output/retrieved_face.jpg
```

## Database Schema

### `detected_faces` Table
Stores detected face metadata from the detect endpoint.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (face_id) |
| original_image_path | text | Path to original uploaded image |
| face_image_path | text | Path to cropped face image |
| identifier | text | Optional client identifier |
| bounding_box | jsonb | Face position {x, y, width, height} |
| confidence | float | Detection confidence (0-1) |
| created_at | timestamptz | Timestamp |

### `enrolled_customers` Table
Stores enrolled customer information with face embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (customer_id) |
| face_id | uuid | Foreign key to detected_faces |
| customer_identifier | text | Unique customer identifier |
| customer_name | text | Customer name (optional) |
| customer_metadata | jsonb | Additional metadata (optional) |
| embedding | vector(512) | ArcFace face embedding |
| created_at | timestamptz | Timestamp |

Vector search is optimized with ivfflat index on the embedding column.

## Image Scaling

All uploaded images are automatically scaled down (max 1920px on longest side) to improve processing performance while maintaining aspect ratio. Supports PNG, JPG, and WEBP formats up to 10MB.

## Technology Stack

- **Face Detection**: RetinaFace ResNet50 with 5 facial landmarks
- **Face Recognition**: ArcFace ResNet100 (512-dimensional embeddings)
- **Vector Search**: PostgreSQL pgvector with ivfflat indexing
- **Object Storage**: MinIO S3-compatible storage for images
- **Image Processing**: Jimp for manipulation, multer for uploads
- **API Framework**: Express.js with TypeScript
- **ML Runtime**: ONNX Runtime Node

## Configuration

Environment variables in `.env`:

```bash
# Database
DATABASE_URL=postgres://postgres:postgres@localhost:5432/face_db

# API
PORT=3000

# Face Detection (0.0 - 1.0, default: 0.8)
FACE_DETECTION_CONFIDENCE_THRESHOLD=0.8

# MinIO S3 Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=facevector-engine
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin123
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true
```

## Storage Structure

### MinIO S3 Bucket (facevector-engine)
```
facevector-engine/
├── originals/          # Original uploaded images
│   └── {uuid}.jpg
└── faces/              # Cropped face images
    └── {face_id}.jpg
```

### Temporary Files (Docker Container)
```
/tmp/facevector/
└── cropped_faces/      # Temporary cropped faces during processing
    └── face_*.jpg      # Auto-cleaned on container restart
```

**MinIO Console**: Access at http://localhost:9001 with credentials from `.env`

## Makefile Commands

```bash
make install        # Install dependencies
make models         # Download ONNX models
make chmod-scripts  # Make scripts executable
make db             # Start PostgreSQL
make run            # Run API locally
make up             # Docker Compose up
make down           # Docker Compose down
make clean          # Remove containers/volumes
make reset          # Clean and rebuild
make lint           # Check code style
make lint-fix       # Auto-fix code style
npm run build       # Compile TypeScript
```

## Troubleshooting

### Database Collation Errors
```bash
make clean && make up
```

### Face Not Detected
1. Lower `FACE_DETECTION_CONFIDENCE_THRESHOLD` in `.env` (e.g., 0.6)
2. Ensure clear, front-facing faces in images
3. Check image format (PNG, JPG, WEBP only)

### ONNX Models Not Found
```bash
make models  # Downloads to models/ directory
```

## License

MIT License - free to use for any purpose.
