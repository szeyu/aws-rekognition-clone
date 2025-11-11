# API Testing with cURL

## Quick Test Commands

### 1. Store an embedding
```bash
# First, convert your image to base64:
IMAGE_BASE64=$(base64 -i /path/to/your/image.jpg)

# Then store it:
curl -X POST http://localhost:3000/api/store_embedding \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\"}"
```

**Response:**
```json
{"id": "550e8400-e29b-41d4-a716-446655440000"}
```

---

### 2. Compare two images
```bash
IMAGE_A=$(base64 -i /path/to/image1.jpg)
IMAGE_B=$(base64 -i /path/to/image2.jpg)

curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d "{\"image_base64_A\": \"${IMAGE_A}\", \"image_base64_B\": \"${IMAGE_B}\"}"
```

**Response:**
```json
{
  "cosine": 0.95,
  "euclidean": 2.34
}
```

---

### 3. Search for similar faces
```bash
IMAGE_BASE64=$(base64 -i /path/to/query/image.jpg)

curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE_BASE64}\", \"top_k\": 5}"
```

**Response:**
```json
[
  {"id": "550e8400-e29b-41d4-a716-446655440000", "cosine": 0.98},
  {"id": "660e8400-e29b-41d4-a716-446655440001", "cosine": 0.92}
]
```

---

### 4. Get stored image
```bash
# Replace {id} with actual ID from store_embedding response
curl -X GET http://localhost:3000/api/image/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{"image_base64": "iVBORw0KGgoAAAANSUhEUgAA..."}
```

---

### 5. List recent images
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

---

### 6. Delete an item
```bash
# Replace {id} with actual ID
curl -X DELETE http://localhost:3000/api/item/550e8400-e29b-41d4-a716-446655440000
```

**Response:**
```json
{"deleted_id": "550e8400-e29b-41d4-a716-446655440000"}
```

---

## Using the Test Script

For automated testing, use the provided test script:

```bash
# Make it executable
chmod +x test-api.sh

# Run with default URL (http://localhost:3000)
./test-api.sh

# Run with custom URL
./test-api.sh http://localhost:3000

# Run with your own image
./test-api.sh http://localhost:3000 /path/to/your/face/image.jpg
```

---

## Example: Complete Workflow

```bash
# 1. Store first image
IMAGE1=$(base64 -i person1.jpg)
RESPONSE1=$(curl -s -X POST http://localhost:3000/api/store_embedding \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE1}\"}")
ID1=$(echo $RESPONSE1 | jq -r '.id')
echo "Stored ID: $ID1"

# 2. Store second image
IMAGE2=$(base64 -i person2.jpg)
RESPONSE2=$(curl -s -X POST http://localhost:3000/api/store_embedding \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE2}\"}")
ID2=$(echo $RESPONSE2 | jq -r '.id')
echo "Stored ID: $ID2"

# 3. Compare them
curl -X POST http://localhost:3000/api/compare \
  -H "Content-Type: application/json" \
  -d "{\"image_base64_A\": \"${IMAGE1}\", \"image_base64_B\": \"${IMAGE2}\"}"

# 4. Search for similar faces to person1
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d "{\"image_base64\": \"${IMAGE1}\", \"top_k\": 3}"

# 5. List all stored images
curl -X GET "http://localhost:3000/api/list?limit=10"
```

---

## Notes

- **Image format**: The API expects base64-encoded images (JPEG, PNG, etc.)
- **Single face**: The API assumes exactly one face per image
- **Image size**: Images are automatically resized to 112x112 for ArcFace processing
- **Base64 encoding**: On macOS use `base64 -i`, on Linux use `base64 -w 0`

