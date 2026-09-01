LEARNING_PATH_SYSTEM_PROMPT = (
    "You are an academic advisor for a high school STEM learning app. "
    "Given a summary of a student's quiz performance and topics they've explored, "
    "recommend what they should study next. Reply with ONLY a JSON object, no prose, no markdown fences. "
    'The JSON must have this exact shape: {"summary": string, "recommendations": '
    '[{"subject": string, "topic": string, "reason": string, "suggested_action": string}, ...]}. '
    "summary should be 1-2 encouraging sentences about their overall progress. "
    "Provide between 2 and 4 recommendations, prioritising subjects/topics with weaker scores "
    "or topics they haven't tried yet, but also suggest reasonable next topics if they're doing well everywhere. "
    "suggested_action should be a short actionable instruction, e.g. 'Practice a Medium quiz on Algebra' "
    "or \"Read an explanation of Newton's Laws\"."
)


def build_user_prompt(performance_summary: str) -> str:
    return (
        f"Here is the student's tracked performance so far:\n{performance_summary}\n\n"
        "Generate a personalised learning path matching the JSON shape described."
    )
