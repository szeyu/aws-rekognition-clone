# FaceVector Engine

A production-ready face recognition and vector similarity search engine. Built with Node.js/TypeScript, this API provides face detection, recognition, and matching using state-of-the-art ArcFace embeddings, RetinaFace detection, and PostgreSQL pgvector for efficient similarity search.

## Features

- ✅ **Face Detection** with 5 facial landmarks (eyes, nose, mouth) using RetinaFace ResNet50
- ✅ **Face Recognition** with 512-dimensional embeddings using ArcFace ResNet100
- ✅ **Face Visualization** - draw bounding boxes and landmarks on images
- ✅ **Face Comparison** - compute similarity between two face images
- ✅ **Vector Similarity Search** - find similar faces using PostgreSQL pgvector
- ✅ **Face Cropping** - extract individual face images from group photos
- ✅ **Multiple Image Formats** - supports JPEG, PNG, GIF, and WebP
- ✅ **Docker Support** - easy deployment with Docker Compose
- ✅ **TypeScript** - fully typed codebase with ESLint

## Architecture Overview

```mermaid
flowchart TB
    subgraph Client["Client Layer"]
        USER[User/Application]
        SCRIPTS[Shell Scripts]
    end

    subgraph API["API Server (Express + TypeScript)"]
        ROUTES[Routes Handler]
        CONTROLLERS[Controllers]
        SERVICES[Services Layer]
        UTILS[Utilities]
    end

    subgraph Models["AI Models (ONNX Runtime)"]
        RETINAFACE[RetinaFace ResNet50<br/>Face Detection + Landmarks]
        ARCFACE[ArcFace ResNet100<br/>512-dim Embeddings]
    end

    subgraph Storage["Storage Layer"]
        DB[(PostgreSQL + pgvector<br/>Vector Embeddings)]
        FILES[File System<br/>project_data/]
    end

    USER -->|Base64 Image| ROUTES
    SCRIPTS -->|Base64 Image| ROUTES
    ROUTES --> CONTROLLERS
    CONTROLLERS --> SERVICES

    SERVICES -->|Detect Faces| RETINAFACE
    SERVICES -->|Generate Embeddings| ARCFACE
    SERVICES --> UTILS

    RETINAFACE -->|Bounding Boxes + Landmarks| SERVICES
    ARCFACE -->|512-dim Vector| SERVICES

    SERVICES -->|Store Vector| DB
    SERVICES -->|Store Image| FILES
    SERVICES -->|Vector Search| DB

    DB -->|Similar Faces| SERVICES
    FILES -->|Image Data| SERVICES

    SERVICES --> CONTROLLERS
    CONTROLLERS -->|JSON Response| USER

    style RETINAFACE fill:#e1f5ff
    style ARCFACE fill:#e1f5ff
    style DB fill:#fff4e1
    style FILES fill:#fff4e1
```

### Data Flow Example: Store Embedding

```mermaid
sequenceDiagram
    participant User
    participant API
    participant RetinaFace
    participant ArcFace
    participant PostgreSQL
    participant FileSystem

    User->>API: POST /api/store_embedding<br/>{image_base64}
    API->>RetinaFace: Detect faces in image
    RetinaFace-->>API: Bounding boxes + landmarks

    loop For each detected face
        API->>API: Crop face region
        API->>ArcFace: Generate embedding
        ArcFace-->>API: 512-dim vector
        API->>FileSystem: Save cropped face
        FileSystem-->>API: File path
        API->>PostgreSQL: INSERT vector + path
        PostgreSQL-->>API: UUID
    end

    API-->>User: {total_faces, stored, results}
```

### Data Flow Example: Search Similar Faces

```mermaid
sequenceDiagram
    participant User
    participant API
    participant RetinaFace
    participant ArcFace
    participant PostgreSQL

    User->>API: POST /api/search<br/>{image_base64, top_k}
    API->>RetinaFace: Detect faces
    RetinaFace-->>API: Bounding boxes

    loop For each detected face
        API->>API: Crop face region
        API->>ArcFace: Generate query embedding
        ArcFace-->>API: 512-dim vector
        API->>PostgreSQL: Vector similarity search<br/>(cosine distance)
        PostgreSQL-->>API: Top K similar faces
    end

    API-->>User: {total_faces, results[]}
```

## Requirements

- Node.js 24+
- Docker + Docker Compose
- PostgreSQL (via Docker)

## Quick Start

### Local Development

```bash
# Install dependencies
make install

# Download ONNX models
make models

# Make scripts executable (if you plan to use them)
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
- ONNX models (ArcFace + RetinaFace) are downloaded automatically during Docker build

## Makefile Commands

```bash
make install        # Install Node dependencies (production only)
make install-dev    # Install all dependencies including dev tools
make models         # Download ONNX models (arcface.onnx, retinaface_resnet50.onnx)
make chmod-scripts  # Make scripts executable
make db             # Start PostgreSQL only (detached)
make run            # Run API locally (requires db to be running)
make up             # Build and start full stack with Docker
make down           # Stop containers
make logs           # View container logs
make clean          # Remove containers and volumes
make reset          # Clean and rebuild everything
make lint           # Check TypeScript code style
make lint-fix       # Auto-fix TypeScript code style issues
```

## API Endpoints

### Detect Faces
Detect all faces in an image and return bounding boxes with facial landmarks (eyes, nose, mouth) sorted by area (largest first).

**POST** `/api/detect-faces`

```bash
# API expects base64-encoded image
curl -X POST http://localhost:3000/api/detect-faces \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUg..."}'

# Or use the script for convenience (handles base64 conversion):
./scripts/detect-faces.sh examples/face1.jpeg
```

**Response:**
```json
{
  "faces": [{
    "BoundingBox": {"Left": 0.234, "Top": 0.156, "Width": 0.312, "Height": 0.445},
    "Confidence": 99.8,
    "PixelBoundingBox": {"Left": 450, "Top": 300, "Width": 600, "Height": 850},
    "Landmarks": [
      {"Type": "eyeLeft", "X": 0.3, "Y": 0.25, "PixelX": 576, "PixelY": 270},
      {"Type": "eyeRight", "X": 0.45, "Y": 0.25, "PixelX": 864, "PixelY": 270},
      {"Type": "nose", "X": 0.375, "Y": 0.35, "PixelX": 720, "PixelY": 378},
      {"Type": "mouthLeft", "X": 0.32, "Y": 0.48, "PixelX": 614, "PixelY": 518},
      {"Type": "mouthRight", "X": 0.43, "Y": 0.48, "PixelX": 826, "PixelY": 518}
    ]
  }],
  "face_count": 1,
  "image_width": 1920,
  "image_height": 1080
}
```

### Visualize Faces
Detect faces and return an image with bounding boxes and landmarks drawn on it.

**POST** `/api/visualize-faces`

```bash
# API expects base64-encoded image
curl -X POST http://localhost:3000/api/visualize-faces \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUg...", "show_landmarks": true, "show_confidence": true}'

# Or use the script for convenience (handles base64 conversion):
./scripts/visualize-faces.sh examples/face1.jpeg
```

**Request Parameters:**
- `image_base64` (string, required): Base64-encoded image data
- `show_landmarks` (boolean, optional): Draw facial landmarks (eyes, nose, mouth). Default: `true`
- `show_confidence` (boolean, optional): Show confidence percentage on boxes. Default: `true`
- `box_width` (number, optional): Line width for bounding boxes. Default: `3`

**Response:**
```json
{
  "image_base64": "/9j/4AAQSkZJRgABA...",
  "face_count": 2,
  "faces": [{
    "BoundingBox": {"Left": 0.234, "Top": 0.156, "Width": 0.312, "Height": 0.445},
    "Confidence": 99.8,
    "PixelBoundingBox": {"Left": 450, "Top": 300, "Width": 600, "Height": 850},
    "Landmarks": [
      {"Type": "eyeLeft", "X": 0.3, "Y": 0.25, "PixelX": 576, "PixelY": 270},
      {"Type": "eyeRight", "X": 0.45, "Y": 0.25, "PixelX": 864, "PixelY": 270},
      {"Type": "nose", "X": 0.375, "Y": 0.35, "PixelX": 720, "PixelY": 378},
      {"Type": "mouthLeft", "X": 0.32, "Y": 0.48, "PixelX": 614, "PixelY": 518},
      {"Type": "mouthRight", "X": 0.43, "Y": 0.48, "PixelX": 826, "PixelY": 518}
    ]
  }]
}
```

The returned `image_base64` contains a JPEG image with:
- Red bounding boxes around detected faces
- Green dots marking facial landmarks (eyes, nose, mouth corners)
- Confidence scores (if enabled)

### Crop Faces
Extract cropped face images from detected faces in an image.

**POST** `/api/crop-faces`

```bash
# API expects base64-encoded image
curl -X POST http://localhost:3000/api/crop-faces \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUg..."}'

# Or use the script for convenience (handles base64 conversion):
./scripts/crop-faces.sh examples/face1.jpeg
```

**Response:**
```json
{
  "face_count": 2,
  "cropped_faces": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABA...",
    "data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUg..."
  ]
}
```

### Store Face Embedding
Store face embeddings from an image. Detects all faces, crops them, and stores each face separately with unique UUIDs.

**POST** `/api/store_embedding`

```bash
# API expects base64-encoded image
curl -X POST http://localhost:3000/api/store_embedding \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUg..."}'

# Or use the script for convenience (handles base64 conversion):
./scripts/store-embedding.sh examples/face1.jpeg
```

**Response:**
```json
{
  "total_faces": 2,
  "stored": 2,
  "failed": 0,
  "results": [
    {"face": "face_0", "id": "550e8400-e29b-41d4-a716-446655440000"},
    {"face": "face_1", "id": "660e8400-e29b-41d4-a716-446655440001"}
  ]
}
```

### Compare Two Faces
Compare two face images and get similarity metrics.

**POST** `/api/compare`

```bash
# API expects base64-encoded images
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"image_base64_A": "iVBORw0KGgoAAAANSUhEUg...", "image_base64_B": "/9j/4AAQSkZJRgABA..."}'

# Or use the script for convenience (handles base64 conversion):
./scripts/compare.sh examples/face1.jpeg examples/face2.jpeg
```

**Response:**
```json
{
  "cosine": 0.95,
  "euclidean": 2.34
}
```

### Search Similar Faces
Find the most similar faces in the database. Detects all faces in the query image and searches for each face separately.

**POST** `/api/search`

```bash
# API expects base64-encoded image
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "iVBORw0KGgoAAAANSUhEUg...", "top_k": 5}'

# Or use the script for convenience (handles base64 conversion):
./scripts/search.sh examples/face1.jpeg 5
```

**Response:**
```json
{
  "total_faces": 2,
  "searched": 2,
  "failed": 0,
  "results": [
    {
      "face": "face_0",
      "matches": [
        {"id": "550e8400-e29b-41d4-a716-446655440000", "cosine": 0.98},
        {"id": "660e8400-e29b-41d4-a716-446655440001", "cosine": 0.92}
      ]
    },
    {
      "face": "face_1",
      "matches": [
        {"id": "770e8400-e29b-41d4-a716-446655440002", "cosine": 0.95}
      ]
    }
  ]
}
```

### Get Image by ID
Retrieve an image by its UUID. Also saves the image to `output/{id}.{ext}`.

**GET** `/api/image/:id`

```bash
curl -X GET http://localhost:3000/api/image/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{
  "image_base64": "iVBORw0KGgo...",
  "saved_to": "/path/to/output/550e8400-e29b-41d4-a716-446655440000.jpeg"
}
```

### List Stored Embeddings
Get a list of stored embeddings.

**GET** `/api/list?limit=N`

```bash
curl -X GET "http://localhost:3000/api/list?limit=10"
```

**Response:**
```json
[
  {"id": "550e8400-e29b-41d4-a716-446655440000", "created_at": "2024-01-01T12:00:00Z"},
  {"id": "660e8400-e29b-41d4-a716-446655440001", "created_at": "2024-01-01T11:00:00Z"}
]
```

### Delete Embedding
Delete an embedding by ID.

**DELETE** `/api/item/:id`

```bash
curl -X DELETE http://localhost:3000/api/item/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{"deleted_id": "550e8400-e29b-41d4-a716-446655440000"}
```

## Using Scripts

Convenience scripts are available in the `scripts/` folder. **Scripts automatically handle base64 conversion** - you just provide file paths! Remember to run `make chmod-scripts` first to make the scripts executable:

```bash
# Make scripts executable (run this first!)
make chmod-scripts

# Detect faces with bounding boxes and landmarks
./scripts/detect-faces.sh examples/face1.jpeg

# Visualize faces with bounding boxes drawn on image
./scripts/visualize-faces.sh examples/face1.jpeg

# Crop faces and get individual face images
./scripts/crop-faces.sh examples/face1.jpeg

# Store an embedding
./scripts/store-embedding.sh examples/face1.jpeg

# Compare two faces
./scripts/compare.sh examples/face1.jpeg examples/face2.jpeg

# Search for similar faces
./scripts/search.sh examples/face1.jpeg 5

# Get an image by ID
./scripts/get-image.sh <uuid>

# List stored embeddings
./scripts/list.sh 10

# Delete an embedding
./scripts/delete.sh <uuid>
```

All scripts accept an optional API URL as the last parameter:
```bash
./scripts/store-embedding.sh examples/face1.jpeg http://localhost:3000
```

## Example Workflow

```bash
# 1. Store first face
./scripts/store-embedding.sh examples/face1.jpeg
# Response: {"id": "abc-123-def"}

# 2. Store second face
./scripts/store-embedding.sh examples/face2.jpeg
# Response: {"id": "xyz-456-uvw"}

# 3. Compare them
./scripts/compare.sh examples/face1.jpeg examples/face2.jpeg

# 4. Search for similar faces
./scripts/search.sh examples/face1.jpeg 3

# 5. List all stored faces
./scripts/list.sh

# 6. Get and save an image
./scripts/get-image.sh abc-123-def
# Image saved to: output/abc-123-def.jpeg
```

## Output Folder

When you call `GET /api/image/:id`, the image is automatically saved to the `output/` folder with the UUID as the filename (e.g., `a69e09ac-e733-4c4e-8ea4-657e6a54d741.jpeg`). The image format (jpeg/png/gif/webp) is automatically detected from the stored image data.

## Testing Face Detection

To verify that face detection is working correctly, you can test with the `examples/box.jpeg` image, which does not contain a face:

```bash
# This should fail with "no_face_detected" error
./scripts/store-embedding.sh examples/box.jpeg
```

**Expected Response:**
```json
{"error": "no_face_detected"}
```

This confirms that the RetinaFace face detector correctly rejects images without faces.

## Technology Stack

- **Face Detection**: RetinaFace ResNet50 - Detects faces with 5 facial landmarks (eyes, nose, mouth)
- **Face Recognition**: ArcFace ResNet100 - Generates 512-dimensional face embeddings
- **Vector Search**: PostgreSQL with pgvector extension for efficient similarity search
- **Image Processing**: Jimp for image manipulation, ONNX Runtime for ML inference
- **API Framework**: Express.js with TypeScript, Zod validation

## Notes

- **Base64 API**: All API endpoints accept base64-encoded images only. Scripts handle the file → base64 conversion transparently.
- **Face Detection**: All face recognition endpoints require RetinaFace to detect at least one face in the image. If no face is detected, the request fails with `{"error": "no_face_detected"}`.
- **Multi-Face Support**: `/api/store_embedding` and `/api/search` endpoints detect and process all faces in an image separately.
- **Image Formats**: Supports JPEG, PNG, GIF, and WebP formats.
- **Example Images**: The `examples/` folder contains sample face images (`face1.jpeg`, `face2.jpeg`, etc.) for testing, and `box.jpeg` to test face detection rejection.
- **Storage**: Images are stored in the `project_data/` directory (mimics cloud storage like S3/OSS), with only file paths stored in the database.

## Configuration

The project uses environment variables defined in `.env`:

```bash
# Database Configuration
DATABASE_URL=postgres://postgres:postgres@localhost:5432/face_db

# PostgreSQL Settings (for Docker Compose)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=face_db

# API Configuration
PORT=3000

# Face Detection Configuration
# Confidence threshold for face detection (0.0 - 1.0)
# Lower values = more detections but more false positives
# Higher values = fewer detections but higher accuracy
FACE_DETECTION_CONFIDENCE_THRESHOLD=0.8

# Project Data Directory (where uploaded images are stored)
PROJECT_DATA_DIR=project_data
```

## Troubleshooting

### Database Collation Errors

If you encounter collation version mismatch errors when running `make up`:

```bash
make clean   # Remove containers and volumes
make up      # Rebuild from scratch
```

### Face Not Detected

If your images are not detecting faces:

1. Check the confidence threshold in `.env` (default: 0.8)
2. Lower the threshold for more sensitive detection (e.g., 0.6)
3. Ensure the image has a clear, front-facing face
4. Verify the image format is supported (JPEG, PNG, GIF, WebP)

### ONNX Models Not Found

If you get errors about missing ONNX models:

```bash
make models  # Download arcface.onnx and retinaface_resnet50.onnx
```

Models are downloaded to the `models/` directory and are required for face detection and embedding generation.

## License

MIT License - feel free to use this project for any purpose.
