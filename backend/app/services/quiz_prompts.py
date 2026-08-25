TOPICS_BY_SUBJECT: dict[str, list[str]] = {
    "Mathematics": ["Algebra", "Geometry", "Trigonometry", "Statistics"],
    "Science": ["Biology", "Chemistry", "Physics", "Earth Science"],
}

QUIZ_SYSTEM_PROMPT = (
    "You are a quiz question generator for a high school STEM learning app. "
    "Given a subject, topic, difficulty and question count, generate multiple-choice questions "
    "and reply with ONLY a JSON array — no prose, no markdown code fences. "
    'Each item must have this exact shape: {"prompt": string, '
    '"options": [{"id": "a", "text": string}, {"id": "b", "text": string}, '
    '{"id": "c", "text": string}, {"id": "d", "text": string}], '
    '"correct_option_id": "a" | "b" | "c" | "d", "explanation": string}. '
    "Options must always have exactly 4 entries with ids a, b, c, d in that order. "
    "The explanation should briefly justify the correct answer. "
    "Keep questions age-appropriate for high school students and strictly on-topic."
)


def build_user_prompt(subject: str, topic: str, difficulty: str, question_count: int) -> str:
    return (
        f"Subject: {subject}\n"
        f"Topic: {topic}\n"
        f"Difficulty: {difficulty}\n"
        f"Number of questions: {question_count}\n\n"
        f"Generate exactly {question_count} unique multiple-choice questions matching the JSON shape described."
    )
