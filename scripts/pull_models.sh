#!/bin/bash
# scripts/pull_models.sh
# Rode uma vez após subir os containers: bash scripts/pull_models.sh

OLLAMA_HOST=${OLLAMA_HOST:-localhost}
OLLAMA_PORT=${OLLAMA_PORT:-11435}
OLLAMA_URL="http://${OLLAMA_HOST}:${OLLAMA_PORT}"

echo "Aguardando Ollama ficar disponível em ${OLLAMA_URL}..."
until curl -s "${OLLAMA_URL}/api/tags" > /dev/null; do
  sleep 2
done

echo "Puxando nomic-embed-text..."
curl -s "${OLLAMA_URL}/api/pull" -H "Content-Type: application/json" -d '{"name":"nomic-embed-text"}'

echo -e "\nModelos disponíveis:"
if command -v python3 &>/dev/null; then
  curl -s "${OLLAMA_URL}/api/tags" | python3 -c \
    "import sys,json; [print(' -', m['name']) for m in json.load(sys.stdin).get('models', [])]"
else
  curl -s "${OLLAMA_URL}/api/tags"
fi