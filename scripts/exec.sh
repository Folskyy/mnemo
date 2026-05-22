#!/bin/bash
# exec.sh

# 1. Subir a stack inteira no docker-compose
echo "Iniciando todos os serviços..."
docker compose up -d

# 2. Aguardar o download do modelo (ollama-pull)
echo "Aguardando download do modelo de embedding (nomic-embed-text)..."
docker compose logs -f ollama-pull

# 3. Testar o endpoint se um arquivo foi passado
if [ -n "$1" ]; then
  if [ -f "$1" ]; then
    echo "Enviando arquivo $1 para o backend..."
    curl -X POST http://localhost:8000/materials/ \
      -F "file=@${1}"
  else
    echo "Erro: Arquivo '$1' não encontrado."
  fi
else
  echo "Stack pronta! Para testar o upload, execute: ./exec.sh <caminho_do_arquivo>"
fi