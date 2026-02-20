# Local RAG on your PC

Minimal RAG (Retrieval-Augmented Generation) that runs entirely on your machine: load your documents, embed them, and ask questions using a local LLM. No cloud or API keys.

## What you need

1. **Ollama** — runs the LLM and embeddings locally  
   - Windows: [ollama.com/download](https://ollama.com/download) or run in PowerShell: `irm https://ollama.com/install.ps1 | iex`  
   - After install, pull two models (one for text, one for embeddings):
     ```powershell
     ollama pull llama3.2
     ollama pull nomic-embed-text
     ```
   - Confirm it’s running: open http://localhost:11434 — you should see “Ollama is running”.

2. **Python 3.10+**  
   - Install from [python.org](https://www.python.org/downloads/) or `winget install Python.Python.3.12`.  
   - Ensure `python` and `pip` are on your PATH.

## Setup

```powershell
cd rag-local
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## Add your documents

Put text files (`.txt`, `.md`) in the `docs` folder. You can add PDFs too (`.pdf` in `docs`).

Example:
```
rag-local/
  docs/
    my-notes.txt
    project-ideas.md
```

## Run

**One-off: build the index and ask a question**

```powershell
python rag.py "What are the main project ideas?"
```

The first run will read all files in `docs`, chunk them, embed with Ollama, and store vectors in `chroma_db/`. Later runs reuse that index and only run the query.

**Interactive: keep asking questions**

```powershell
python rag.py
```

Then type questions and press Enter. Type `quit` or `exit` to stop.

## Options

- **Different docs folder:** `python rag.py --docs path/to/folder "your question"`
- **Rebuild index (e.g. after adding docs):** delete the `chroma_db` folder and run again, or use `--rebuild`: `python rag.py --rebuild "question"`

## Troubleshooting

- **“Connection refused” to localhost:11434** — Start Ollama (open the Ollama app or run `ollama serve`).
- **“model not found”** — Run `ollama pull llama3.2` and `ollama pull nomic-embed-text`.
- **Slow first answer** — First run builds the index (embeds all docs); later queries are faster.
- **Out of memory** — Use a smaller model: `ollama pull llama3.2:1b` and set `LLM_MODEL=llama3.2:1b` in the script or env.
