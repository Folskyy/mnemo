dev:
	cd frontend && npm run dev & uvicorn backend.main:app --reload

install:
	cd frontend && npm install
	pip install -r backend/requirements.txt

db:
	prisma migrate dev

reset:
	prisma migrate reset