#!/usr/bin/env python3
"""
Minimal local RAG: load docs from a folder, embed with Ollama, query with a local LLM.
Usage:
  python rag.py "Your question here"
  python rag.py                    # interactive mode
  python rag.py --docs path/to/docs "question"
  python rag.py --rebuild "question"   # rebuild index from docs
"""

import argparse
import os

from langchain_community.document_loaders import DirectoryLoader, TextLoader, PyPDFLoader
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings, ChatOllama
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA

# Default paths
DEFAULT_DOCS = os.path.join(os.path.dirname(__file__), "docs")
DEFAULT_DB = os.path.join(os.path.dirname(__file__), "chroma_db")
EMBED_MODEL = os.environ.get("RAG_EMBED_MODEL", "nomic-embed-text")
LLM_MODEL = os.environ.get("RAG_LLM_MODEL", "llama3.2")


def get_loader(docs_path: str):
    """Load .txt, .md, and .pdf from docs_path."""
    loaders = []
    if os.path.isdir(docs_path):
        # Text and markdown
        loaders.append(
            DirectoryLoader(
                docs_path,
                glob="**/*.txt",
                loader_cls=TextLoader,
                loader_kwargs={"encoding": "utf-8", "autodetect_encoding": True},
            )
        )
        loaders.append(
            DirectoryLoader(docs_path, glob="**/*.md", loader_cls=TextLoader)
        )
        # PDFs (DirectoryLoader + PyPDFLoader per file)
        loaders.append(
            DirectoryLoader(docs_path, glob="**/*.pdf", loader_cls=PyPDFLoader)
        )
    docs = []
    for loader in loaders:
        try:
            docs.extend(loader.load())
        except Exception as e:
            print(f"Warning: skipped some files: {e}")
    return docs


def build_index(docs_path: str, db_path: str, embed_model: str) -> Chroma:
    """Chunk docs, embed with Ollama, store in Chroma."""
    print("Loading documents...")
    docs = get_loader(docs_path)
    if not docs:
        raise SystemExit(f"No .txt, .md, or .pdf files found in {docs_path}. Add some to the docs folder.")
    print(f"Loaded {len(docs)} document(s). Splitting into chunks...")
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=800,
        chunk_overlap=150,
        length_function=len,
    )
    chunks = splitter.split_documents(docs)
    print(f"Created {len(chunks)} chunks. Embedding (this may take a minute)...")
    embeddings = OllamaEmbeddings(model=embed_model)
    vectorstore = Chroma.from_documents(
        chunks,
        embeddings,
        persist_directory=db_path,
    )
    vectorstore.persist()
    print("Index saved.")
    return vectorstore


def get_qa_chain(docs_path: str, db_path: str, embed_model: str, llm_model: str, rebuild: bool):
    """Build or load vector store and return a RetrievalQA chain."""
    if rebuild or not os.path.isdir(db_path):
        if os.path.isdir(db_path):
            import shutil
            shutil.rmtree(db_path)
        vectorstore = build_index(docs_path, db_path, embed_model)
    else:
        embeddings = OllamaEmbeddings(model=embed_model)
        vectorstore = Chroma(persist_directory=db_path, embedding_function=embeddings)
    retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
    llm = ChatOllama(model=llm_model, temperature=0.2)
    return RetrievalQA.from_chain_type(
        llm=llm,
        retriever=retriever,
        chain_type="stuff",
        return_source_documents=False,
    )


def main():
    parser = argparse.ArgumentParser(description="Local RAG with Ollama and Chroma")
    parser.add_argument("question", nargs="?", help="Question to ask (optional; if omitted, interactive mode)")
    parser.add_argument("--docs", default=DEFAULT_DOCS, help=f"Documents folder (default: {DEFAULT_DOCS})")
    parser.add_argument("--rebuild", action="store_true", help="Rebuild the index from documents")
    args = parser.parse_args()

    if not os.path.isdir(args.docs):
        os.makedirs(args.docs, exist_ok=True)
        print(f"Created empty docs folder: {args.docs}")
        print("Add .txt, .md, or .pdf files there and run again.")
        return

    qa = get_qa_chain(args.docs, DEFAULT_DB, EMBED_MODEL, LLM_MODEL, args.rebuild)

    if args.question:
        print("Querying...")
        out = qa.invoke({"query": args.question})
        print(out["result"])
        return

    # Interactive
    print("Local RAG ready. Type your question and press Enter. Type 'quit' or 'exit' to stop.")
    while True:
        try:
            q = input("\nYou: ").strip()
        except EOFError:
            break
        if not q or q.lower() in ("quit", "exit"):
            break
        out = qa.invoke({"query": q})
        print("RAG:", out["result"])


if __name__ == "__main__":
    main()
