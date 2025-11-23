# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AWS Rekognition Clone - An open-source alternative to AWS Rekognition. A Node.js/TypeScript face recognition system using ArcFace embeddings for face recognition, RetinaFace for face detection with landmarks, and PostgreSQL with pgvector extension for efficient vector similarity search.

## Development Commands

### Setup
```bash
make install          # Install Node dependencies (production only)
make install-dev      # Install all dependencies including dev tools
make models           # Download ONNX models (arcface.onnx, retinaface_resnet50.onnx) to models/
make chmod-scripts    # Make scripts in scripts/ executable
```

**Model Downloads** (`make models`):
- ArcFace (arcfaceresnet100-8.onnx) from HuggingFace → saved as `models/arcface.onnx`
- RetinaFace ResNet50 from Google Storage → saved as `models/retinaface_resnet50.onnx`
- Models only downloaded if they don't already exist

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

### Build & Lint
```bash
npm run build         # Compile TypeScript to dist/
npm run dev           # Watch mode with tsx
npm start             # Run compiled dist/server.js
make lint             # Check TypeScript code style
make lint-fix         # Auto-fix TypeScript code style issues
```

## Architecture

### Core Flow
1. **Server startup** (`src/server.ts`): Initialize DB connection → Load ONNX models (ArcFace + RetinaFace) → Start Express server
2. **Face detection** (`src/retinaface.ts`, `src/embedding.ts`): RetinaFace detects faces with configurable thresholds
3. **Embedding generation** (`src/embedding.ts`): ArcFace generates 512-dim vectors from 112x112 RGB images
4. **Storage** (`src/db.ts`, `src/services/dbService.ts`): PostgreSQL with pgvector extension for vector similarity search

### Key Components

**ONNX Model Pipeline**:
- `initModels()` (`src/embedding.ts`): Loads ArcFace (embedding) and RetinaFace (detection) ONNX models at startup
- `detectAllFacesWithRetinaFace(base64)` (`src/embedding.ts`): RetinaFace inference returning all detected faces with bounding boxes
  - Input: 640x640 (mobile) or 840x840 (resnet50) resized image
  - Multi-scale detection with strides [8, 16, 32]
  - Default confidence threshold: 0.6 (VIS_THRESHOLD), configurable via env var FACE_DETECTION_CONFIDENCE_THRESHOLD
  - NMS (Non-Maximum Suppression) threshold: 0.4 to filter overlapping boxes
  - Returns array of faces sorted by area (largest first) with landmarks (eyes, nose, mouth)
- `preprocessImage(base64)` (`src/embedding.ts`): Resize to 112x112, normalize to [-1, 1] per channel
- `computeEmbedding(preprocessed)` (`src/embedding.ts`): ArcFace inference → 512-dim Float32Array
- RetinaFace model (`src/retinaface.ts`): Detects faces with 5 facial landmarks per face

**Database Layer** (`src/db.ts`):
- `connectDB()`: Creates database if missing, enables pgcrypto + vector extensions
- Table schema: `face_embeddings(id uuid, embedding vector(512), image_path text, created_at timestamptz)`
- Handles collation version mismatches (suggests `make clean` if detected)
- Images stored as files in `project_data/` directory (mimics S3/OSS), paths stored in DB

**Service Layer**:
- `src/services/imageService.ts`: Image I/O, path resolution, face detection orchestration
- `src/services/dbService.ts`: Vector insert/search using pgvector operators (`<->` for distance, `<=>` for cosine)
- `src/services/cropFacesService.ts`: Extract cropped face images from detected bounding boxes
- `src/services/outputService.ts`: Saves retrieved images to `output/{id}.{ext}`

**Utils Layer** (`src/utils/`):
- `imageUtils.ts`: Image manipulation (crop, dimensions, format detection, base64-to-Jimp conversion)
- `boundingBoxUtils.ts`: Coordinate conversions (normalized ↔ pixel bounding boxes)
- `nmsUtils.ts`: Non-Maximum Suppression for filtering overlapping face detections
- `visualizationUtils.ts`: Draw bounding boxes and landmarks on images

**Controllers** (`src/controllers/`):
- `faceDetectionController.ts`: `/detect-faces` - face detection with bounding boxes
- `faceVisualizationController.ts`: `/visualize-faces` - face detection with visual output
- `cropFacesController.ts`: `/crop-faces` - extract cropped face images
- `embeddingController.ts`: `/store_embedding`, `/compare`, `/search` - face recognition and similarity
- `imageController.ts`: `/image/:id`, `/list`, `/item/:id` - CRUD operations

**Routes** (`src/routes.ts`):
- POST `/api/detect-faces` - Accepts `image_base64` - Detect faces with bounding boxes and landmarks
- POST `/api/visualize-faces` - Accepts `image_base64` - Return image with drawn bounding boxes/landmarks
- POST `/api/crop-faces` - Accepts `image_base64` - Extract cropped face images from detected faces
- POST `/api/store_embedding` - Accepts `image_base64` - Detect face → Generate embedding → Store with image
- POST `/api/compare` - Accepts `image_base64_A`, `image_base64_B` - Compare two images (cosine similarity + euclidean distance)
- POST `/api/search` - Accepts `image_base64` - Vector similarity search (top_k results)
- GET `/api/image/:id` - Retrieve and save image to output/
- GET `/api/list?limit=N` - List stored embeddings
- DELETE `/api/item/:id` - Delete embedding by UUID

### Error Handling
- All face-processing endpoints throw `{code: "NO_FACE"}` errors → Returns `{"error": "no_face_detected"}` (400)
- Face detection configured to reject images without faces (e.g., `examples/box.jpeg`)

### API Input Format & Storage

**Base64-Only Design:**
- All endpoints accept base64-encoded images (no file paths)
- Scripts handle file path → base64 conversion automatically
- API is fully stateless and portable across environments
- **Why base64?** Docker containers don't mount home directories; base64 makes the API truly portable

**ONNX Models:**
- ArcFace: `models/arcface.onnx` (face embeddings)
- RetinaFace: `models/retinaface_resnet50.onnx` (face detection)
- Downloaded via `make models` from HuggingFace/Google Storage

**Storage Directories:**
- `project_data/` - Persistent storage for uploaded images (mimics S3/OSS bucket)
  - Files saved as `{uuid}.jpg`, paths stored in database
  - Future: Migrate to S3/MinIO for cloud storage
- `output/cropped_faces/` - Temporary directory for cropped faces during processing
  - Cleared on each multi-face processing request
- `output/{id}.{ext}` - Retrieved images from GET `/api/image/:id`
  - Temporary location for user downloads

## Testing
Use example images in `examples/` folder:
- `face1.jpeg`, `face2.jpeg` - Valid face images for testing
- `box.jpeg` - No face (for testing detection rejection)

Example scripts in `scripts/` (run `make chmod-scripts` first):
```bash
./scripts/detect-faces.sh examples/face1.jpeg              # Detect faces with bounding boxes
./scripts/visualize-faces.sh examples/face1.jpeg           # Visualize faces with drawn boxes
./scripts/crop-faces.sh examples/face1.jpeg                # Extract cropped face images
./scripts/store-embedding.sh examples/face1.jpeg           # Store face embedding
./scripts/compare.sh examples/face1.jpeg examples/face2.jpeg  # Compare two faces
./scripts/search.sh examples/face1.jpeg 5                  # Search similar faces
./scripts/list.sh 10                                       # List stored embeddings
./scripts/get-image.sh <uuid>                              # Retrieve image by ID
./scripts/delete.sh <uuid>                                 # Delete embedding
```

All scripts accept optional API URL as last parameter (default: http://localhost:3000).

**Note:** Scripts accept file paths for convenience, but internally convert them to base64 before calling the API. The API itself only accepts base64-encoded images!

## Configuration

**Environment Variables** (`.env`):
- `DATABASE_URL`: PostgreSQL connection string (default: `postgres://postgres:postgres@localhost:5432/face_db`)
- `PORT`: API server port (default: 3000)
- `FACE_DETECTION_CONFIDENCE_THRESHOLD`: Face detection confidence threshold 0.0-1.0 (default: 0.8)
- `PROJECT_DATA_DIR`: Directory for uploaded images (default: `project_data`)

**Configuration Constants** (`src/config/constants.ts`):
- `RETINAFACE.CONFIDENCE_THRESHOLD`: 0.02 (initial detection threshold, filtered by VIS_THRESHOLD later)
- `RETINAFACE.VIS_THRESHOLD`: 0.8 (final visibility threshold, overridden by env var FACE_DETECTION_CONFIDENCE_THRESHOLD)
- `RETINAFACE.NMS_THRESHOLD`: 0.4 (Non-Maximum Suppression for overlapping boxes)
- `RETINAFACE.TOP_K`: 5000 (maximum detections before NMS)
- `RETINAFACE.KEEP_TOP_K`: 750 (maximum detections after NMS)
- `PATHS.OUTPUT_DIR`: "output" (directory for visualized/retrieved images)
- `PATHS.CROPPED_FACES_DIR`: "output/cropped_faces" (directory for cropped face images)
- `PATHS.PROJECT_DATA_DIR`: process.env.PROJECT_DATA_DIR || "project_data" (uploaded images storage)
- Image sizes: 640x640 (mobile0.25) or 840x840 (resnet50)

## Database Notes
- DATABASE_URL env var required (format: `postgres://user:pass@host:port/dbname`)
- Database auto-created on first connection if missing
- pgvector extension required for vector operations
- If collation errors occur during `make up`, run `make clean` then `make up` to reset volumes
