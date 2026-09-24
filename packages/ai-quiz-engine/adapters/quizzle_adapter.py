import json

def to_quizzle_format(universal_quiz: dict) -> dict:
    quizzle_questions = []
    
    for q in universal_quiz.get("questions", []):
        q_type = q.get("type", "multiple_choice")
        options = q.get("options", [])
        correct_idx = q.get("correct_answer", 0)
        
        if q_type == "true_false":
            answers = [
                {"type": "text", "content": "True", "is_correct": correct_idx == 0 or correct_idx is True},
                {"type": "text", "content": "False", "is_correct": correct_idx == 1 or correct_idx is False}
            ]
            qz_type = "true-false"
        else:
            qz_type = "multiple-choice"
            answers = []
            for idx, opt in enumerate(options):
                answers.append({
                    "type": "text",
                    "content": str(opt),
                    "is_correct": (idx == correct_idx)
                })
        
        quizzle_questions.append({
            "title": q.get("question", ""),
            "type": qz_type,
            "timer": q.get("time_limit", 20),
            "pointMultiplier": "none",
            "answers": answers
        })
        
    return {
        "title": universal_quiz.get("title", "Wizard Quiz"),
        "settings": {
            "description": f"Wizard {universal_quiz.get('book', '')} {universal_quiz.get('unit', '')} - Level: {universal_quiz.get('level', '')}",
            "difficulty": "medium",
            "defaultTimer": 20,
            "scoringMode": "time-based"
        },
        "questions": quizzle_questions
    }

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        qz = to_quizzle_format(data)
        out_file = sys.argv[2] if len(sys.argv) > 2 else "quiz_quizzle.json"
        with open(out_file, 'w', encoding='utf-8') as f:
            json.dump(qz, f, indent=2, ensure_ascii=False)
        print(f"Exported to Quizzle format: {out_file}")
