# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Rekognition Clone - An open-source alternative to AWS Rekognition. A Node.js/TypeScript face recognition system using ArcFace embeddings, RetinaFace/SCRFD face detection, with PostgreSQL (pgvector) for similarity search.

## Development Commands

### Setup
```bash
make install          # Install Node dependencies
make models           # Download ONNX models (arcface.onnx, scrfd.onnx, retinaface_resnet50.onnx) to models/
make chmod-scripts    # Make scripts in scripts/ executable
```

### Running Locally
```bash
make db               # Start PostgreSQL only (detached, port 5432)
make run              # Run API with tsx watch (requires db running)
                      # Sets DATABASE_URL=postgres://postgres:postgres@localhost:5432/face_db
                      # API runs on http://localhost:3000/api
```

### Docker
```bash
make up               # Build and start full stack (API + Postgres)
make down             # Stop containers
make logs             # Tail container logs
make clean            # Remove containers and volumes
make reset            # Clean and rebuild from scratch
```

### Build
```bash
npm run build         # Compile TypeScript to dist/
npm run dev           # Watch mode with tsx
npm start             # Run compiled dist/server.js
```

## Architecture

### Core Flow
1. **Server startup** (`src/server.ts`): Initialize DB connection → Load ONNX models → Start Express server
2. **Face detection** (`src/embedding.ts`): SCRFD detects faces with configurable thresholds
3. **Embedding generation** (`src/embedding.ts`): ArcFace generates 512-dim vectors from 112x112 RGB images
4. **Storage** (`src/db.ts`, `src/services/dbService.ts`): PostgreSQL with pgvector extension for vector similarity search

### Key Components

**ONNX Model Pipeline** (`src/embedding.ts`):
- `initModels()`: Loads SCRFD (face detection), ArcFace (embedding), and GenderAge (analysis) ONNX models at startup
- `detectFace(base64)`: SCRFD inference returning boolean (face detected or not)
- `detectAllFaces(base64)`: SCRFD inference returning all detected faces with bounding boxes
  - Input: 640x640 resized image
  - Strides: [8, 16, 32] for multi-scale detection
  - Threshold: 0.5 confidence, min 20px face size
  - Aspect ratio validation (0.25-4.0) to filter non-face objects
  - Returns array of faces sorted by area (largest first)
- `preprocessImage(base64)`: Resize to 112x112, normalize to [-1, 1] per channel
- `computeEmbedding(preprocessed)`: ArcFace inference → 512-dim Float32Array
- `analyzeAgeGender(croppedFaceBase64)`: GenderAge model inference → age range and gender with confidence

**Database Layer** (`src/db.ts`):
- `connectDB()`: Creates database if missing, enables pgcrypto + vector extensions
- Table schema: `face_embeddings(id uuid, embedding vector(512), image_base64 text, created_at timestamptz)`
- Handles collation version mismatches (suggests `make clean` if detected)

**Service Layer**:
- `src/services/imageService.ts`: Image I/O, path resolution, face detection orchestration
- `src/services/dbService.ts`: Vector insert/search using pgvector operators (`<->` for distance, `<=>` for cosine)
- `src/services/faceDetectionService.ts`: Face detection workflows, bounding box calculations
- `src/services/faceAnalysisService.ts`: Age/gender analysis using genderage.onnx model
- `src/services/outputService.ts`: Saves retrieved images to `output/{id}.{ext}`

**Utils Layer** (`src/utils/`):
- `imageUtils.ts`: Image manipulation (crop, dimensions, format detection)
- `boundingBoxUtils.ts`: Coordinate conversions (normalized ↔ pixel bounding boxes)
- `faceAttributeUtils.ts`: Gender label mapping and age range calculations

**Controllers** (`src/controllers/`):
- `faceAnalysisController.ts`: `/analyze-face` - face detection with age/gender attributes
- `faceDetectionController.ts`: `/detect-faces` - face detection with bounding boxes
- `embeddingController.ts`: `/store_embedding`, `/compare`, `/search` - face recognition and similarity
- `imageController.ts`: `/image/:id`, `/list`, `/item/:id` - CRUD operations

**Routes** (`src/routes.ts`):
- POST `/api/analyze-face` - Detect faces with age/gender attributes (AWS Rekognition DetectFaces style)
- POST `/api/detect-faces` - Detect faces with bounding boxes (optionally crop face images)
- POST `/api/store_embedding` - Detect face → Generate embedding → Store with image
- POST `/api/compare` - Compare two images (cosine similarity + euclidean distance)
- POST `/api/search` - Vector similarity search (top_k results)
- GET `/api/image/:id` - Retrieve and save image to output/
- GET `/api/list?limit=N` - List stored embeddings
- DELETE `/api/item/:id` - Delete embedding by UUID

### Error Handling
- All face-processing endpoints throw `{code: "NO_FACE"}` errors → Returns `{"error": "no_face_detected"}` (400)
- Face detection configured to reject images without faces (e.g., `examples/box.jpeg`)

### File Paths
- Working directory: Project root (where you run `make` commands)
- Image paths in requests can be absolute or relative to project root
- ONNX models expected at `models/scrfd.onnx`, `models/arcface.onnx`, and `models/genderage.onnx`
- Output images saved to `output/{id}.{ext}`

## Testing
Use example images in `examples/` folder:
- `face1.jpeg`, `face2.jpeg` - Valid face images for testing
- `box.jpeg` - No face (for testing detection rejection)

Example scripts in `scripts/`:
```bash
./scripts/analyze-face.sh examples/face1.jpeg              # Analyze face with age/gender
./scripts/detect-faces.sh examples/face1.jpeg              # Detect faces with bounding boxes
./scripts/detect-faces.sh examples/face1.jpeg true         # Detect faces + get cropped images
./scripts/store-embedding.sh examples/face1.jpeg           # Store face embedding
./scripts/compare.sh examples/face1.jpeg examples/face2.jpeg  # Compare two faces
./scripts/search.sh examples/face1.jpeg 5                  # Search similar faces
./scripts/list.sh 10                                       # List stored embeddings
./scripts/get-image.sh <uuid>                              # Retrieve image by ID
./scripts/delete.sh <uuid>                                 # Delete embedding
```

All scripts accept optional API URL as last parameter (default: http://localhost:3000).
See `TESTING.md` for comprehensive API testing examples.

## Configuration Constants

In `src/embedding.ts` (face detection tuning):
- `SCRFD_CONFIDENCE_THRESHOLD`: 0.5 (lower = more detections, more false positives)
- `SCRFD_MIN_FACE_SIZE`: 20px (minimum face width/height)
- Aspect ratio: 0.25-4.0 (filters non-face rectangular objects)

## Database Notes
- DATABASE_URL env var required (format: `postgres://user:pass@host:port/dbname`)
- Database auto-created on first connection if missing
- pgvector extension required for vector operations
- If collation errors occur during `make up`, run `make clean` then `make up` to reset volumes
