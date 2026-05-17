dev:
	docker compose up -d
	cd frontend && npm run dev & cd backend && uvicorn main:app --reload
stop:
	docker compose down

install:
	cd frontend && npm install
	pip install -r backend/requirements.txt

db:
	docker compose up -d postgres
	sleep 2
	python backend/database.py

reset:
	docker compose down -v
	docker compose up -d