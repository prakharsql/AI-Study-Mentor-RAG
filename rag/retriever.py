def retrieve_context(vector_db, query, k=3):
    docs = vector_db.similarity_search(query, k=k)
    context = "\n".join([doc.page_content for doc in docs])
    return context
