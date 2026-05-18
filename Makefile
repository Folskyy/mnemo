dev:
	docker compose up -d
	cd frontend && npm run dev & cd backend && ../.venv/bin/uvicorn main:app --reload

stop:
	docker compose down

install:
	python3 -m venv .venv
	.venv/bin/pip install -r backend/requirements.txt
	cd frontend && npm install

db:
	docker compose up -d postgres
	sleep 2
	python backend/database.py

reset:
	docker compose down -v
	docker compose up -d