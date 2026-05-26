.PHONY: up down clean install status logs reset

up:
	docker compose up -d --build
	@echo "\n=============================================="
	@echo "Services started successfully!"
	@echo "  Frontend:    http://localhost:3000"
	@echo "  Backend API: http://localhost:8000"
	@echo "  ChromaDB:    http://localhost:8001"
	@echo "  Ollama:      http://localhost:11435" -local-
	@echo "==============================================\n"

down:
	docker compose down

logs:
	docker compose logs -f $(service)

status:
	docker compose ps

clear-db:
	sudo rm -rf data/*
	docker compose up -d --build --remove-orphans postgres chromadb

clean:
	docker compose down -v --rmi all --remove-orphans

install:
	python3 -m venv .venv
	.venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm install

reset: clean up