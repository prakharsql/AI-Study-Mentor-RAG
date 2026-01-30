from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression

# Dummy training data (replace later)
texts = [
    "OSI model layers",
    "TCP vs UDP comparison",
    "Machine learning algorithms",
    "Overfitting and underfitting"
]

labels = [1, 1, 0, 0]  # 1 = Important, 0 = Less Important

vectorizer = TfidfVectorizer()
X = vectorizer.fit_transform(texts)

model = LogisticRegression()
model.fit(X, labels)

def predict_importance(topic):
    vec = vectorizer.transform([topic])
    prediction = model.predict(vec)
    return "🔥 Important Topic" if prediction[0] == 1 else "Normal Topic"
