VENV=.venv
PYTHON=$(VENV)/bin/python
PIP=$(VENV)/bin/pip
UVICORN=$(VENV)/bin/uvicorn

dev:
	docker compose up -d
	cd frontend && npm run dev & \
	cd backend && ../$(UVICORN) main:app --reload

stop:
	docker compose down

install:
	python3 -m venv $(VENV)
	$(PIP) install -r backend/requirements.txt
	cd frontend && npm install

db:
	@echo "\nPython:"
	@$(PYTHON) -c "import sys; print(sys.executable)"

	docker compose up -d postgres
	sleep 2
	$(PYTHON) backend/database.py

reset:
	docker compose down -v
	docker compose up -d