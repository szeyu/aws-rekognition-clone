include .env
export

.PHONY: install install-dev models dev db up down logs clean chmod-scripts reset run lint lint-fix

# Install production Node dependencies only (for Docker/production)
install:
	npm ci --only=production

# Install all Node dependencies including dev (for local development)
install-dev:
	npm install

# Lint TypeScript codebase (check only)
lint: install-dev
	npm run lint

# Lint and auto-fix TypeScript codebase
lint-fix: install-dev
	npm run lint:fix

# Download ONNX models locally into models/ (only if they don't exist)
models:
	@mkdir -p models
	@if [ ! -f models/arcface.onnx ]; then \
		echo "↓ Downloading arcface.onnx..."; \
		curl -L -o models/arcface.onnx https://huggingface.co/onnxmodelzoo/arcfaceresnet100-8/resolve/main/arcfaceresnet100-8.onnx; \
		echo "✓ arcface.onnx downloaded"; \
	else \
		echo "✓ arcface.onnx already exists, skipping download"; \
	fi
	@if [ ! -f models/retinaface_resnet50.onnx ]; then \
		echo "↓ Downloading retinaface_resnet50.onnx..."; \
		curl -L -o models/retinaface_resnet50.onnx https://storage.googleapis.com/ailia-models/retinaface/retinaface_resnet50.onnx; \
		echo "✓ retinaface_resnet50.onnx downloaded"; \
	else \
		echo "✓ retinaface_resnet50.onnx already exists, skipping download"; \
	fi
	@echo "✓ All models ready"

# Launch only the Postgres service via Docker Compose
db:
	docker compose -f docker-compose.yml up -d db

# Run the API locally
run: install db
	npm run dev

# Build and start the full stack (API + Postgres) with Docker Compose
up:
	HOST_PROJECT_DIR=$$(pwd) docker compose -f docker-compose.yml --env-file .env up --build

# Stop and remove running containers
down:
	docker compose -f docker-compose.yml --env-file .env down

# Tail logs from running containers
logs:
	docker compose -f docker-compose.yml --env-file .env logs -f

# Remove containers, networks, and volumes
clean:
	docker compose -f docker-compose.yml down -v

# Clean and rebuild everything from scratch
reset: clean
	HOST_PROJECT_DIR=$$(pwd) docker compose -f docker-compose.yml --env-file .env up --build

# Make all scripts executable
chmod-scripts:
	chmod +x scripts/*
