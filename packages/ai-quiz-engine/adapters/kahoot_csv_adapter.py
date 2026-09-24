import csv
import json
import sys

def to_kahoot_csv(universal_quiz: dict, output_path: str):
    headers = [
        "Question",
        "Answer 1",
        "Answer 2",
        "Answer 3",
        "Answer 4",
        "Time limit (sec)",
        "Correct answer"
    ]
    
    with open(output_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        
        for q in universal_quiz.get("questions", []):
            question_text = q.get("question", "")[:120]
            options = q.get("options", [])
            correct_idx = q.get("correct_answer", 0)
            
            # Fill up to 4 options
            ans = ["", "", "", ""]
            for i in range(min(4, len(options))):
                ans[i] = str(options[i])[:75]
                
            time_limit = q.get("time_limit", 20)
            correct_ans_num = (correct_idx + 1) if isinstance(correct_idx, int) else 1
            
            writer.writerow([
                question_text,
                ans[0],
                ans[1],
                ans[2],
                ans[3],
                time_limit,
                correct_ans_num
            ])
            
    print(f"Exported Kahoot CSV format: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        out = sys.argv[2] if len(sys.argv) > 2 else "kahoot_import.csv"
        to_kahoot_csv(data, out)
