import streamlit as st
from rag.document_loader import load_documents
from rag.vector_store import create_vector_store
from rag.retriever import retrieve_context
from dl.semantic_model import semantic_similarity
from ml.topic_importance import predict_importance
from langchain_ollama import ChatOllama

# Streamlit setup
st.set_page_config(page_title="AI Study Mentor", layout="wide")
st.title("🎓 AI Study Mentor using RAG")

# Load documents
with st.spinner("Loading study material..."):
    docs = []
    docs += load_documents("data/textbooks")
    docs += load_documents("data/notes")
    docs += load_documents("data/pyqs")

    vector_db = create_vector_store(docs)

st.success("Study material loaded successfully!")

# User input
question = st.text_input("📘 Ask a study question:")

if question:
    # Retrieve context
    context = retrieve_context(vector_db, question)

    # Local LLM (TinyLLaMA via Ollama)
    llm = ChatOllama(
        model="tinyllama",
        temperature=0
    )

    # Prompt
    prompt = f"""
    Answer the question strictly using the context below.
    If the answer is not in the context, say "Not found in study material."

    Context:
    {context}

    Question:
    {question}
    """

    # Get answer
    response = llm.invoke(prompt)
    answer = response.content

    # Analysis
    similarity = semantic_similarity(question, answer)
    importance = predict_importance(question)

    # Output
    st.subheader("🧠 Answer")
    st.write(answer)

    st.subheader("📊 Analysis")
    st.write(f"Semantic Similarity Score: {similarity:.2f}")
    st.write(f"Topic Importance: {importance}")
    st.write(f"📄 Total documents loaded: {len(docs)}")
