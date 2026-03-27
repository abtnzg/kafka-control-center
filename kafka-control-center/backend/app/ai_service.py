import anthropic
from app.config import ANTHROPIC_API_KEY

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

def summarize_topic_sample(messages: list[str]) -> str:
    if not messages:
        return "Aucun message à analyser."
    prompt = f"Voici des exemples de messages Kafka:\n\n" + "\n".join(messages[:20]) +              "\n\nRésume le type de données, les patterns, et les risques potentiels."
    msg = client.messages.create(
        model="claude-3-5-haiku-20241022",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return msg.content[0].text
