import os
import sys
import json
import argparse
from pathlib import Path

# Import adapters
from adapters.quizzle_adapter import to_quizzle_format
from adapters.kahoot_csv_adapter import to_kahoot_csv
from adapters.paperclickers_adapter import to_printable_html

def load_json(filepath: str) -> dict:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read().lstrip('\ufeff')
        return json.loads(content)

def save_json(data: dict, filepath: str):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def main():
    default_output = Path(__file__).resolve().parent / "output"
    parser = argparse.ArgumentParser(description="Wizard Gamification AI Quiz Engine")
    parser.add_argument("--syllabus", type=str, default="", help="Path to syllabus JSON (or uses sample)")
    parser.add_argument("--book", type=str, default="W4", help="Wizard Book (e.g. W2, W4, W6, W8, Teens)")
    parser.add_argument("--unit", type=str, default="Unit 5", help="Wizard Unit")
    parser.add_argument("--level", type=str, default="Teens", choices=["Kids", "Teens", "Adults"])
    parser.add_argument("--target", type=str, default="all", choices=["quizzle", "kahoot", "paper", "all"])
    parser.add_argument("--output-dir", type=str, default=str(default_output), help="Directory for generated quiz files")
    
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Resolve source data
    if args.syllabus and os.path.exists(args.syllabus):
        print(f"Loading syllabus from {args.syllabus}...")
        quiz_data = load_json(args.syllabus)
    else:
        # Default fallback to sample data
        sample_path = Path(__file__).resolve().parent.parent / "syllabus-data" / "w4_unit5_sample.json"
        if sample_path.exists():
            print(f"Using default Wizard curriculum sample: {sample_path}")
            quiz_data = load_json(str(sample_path))
        else:
            print("Error: No syllabus file found!")
            sys.exit(1)
            
    slug = f"{args.book.lower()}_{args.unit.lower().replace(' ', '_')}"
    print(f"\nProcessing Quiz: {quiz_data.get('title')} ({len(quiz_data.get('questions', []))} questions)")
    
    # Universal JSON
    universal_out = output_dir / f"{slug}_universal.json"
    save_json(quiz_data, str(universal_out))
    print(f"[OK] Universal JSON: {universal_out}")
    
    # 2. Export targets
    if args.target in ["quizzle", "all"]:
        quizzle_data = to_quizzle_format(quiz_data)
        quizzle_out = output_dir / f"{slug}_quizzle.json"
        save_json(quizzle_data, str(quizzle_out))
        print(f"[OK] Quizzle format: {quizzle_out}")
        
    if args.target in ["kahoot", "all"]:
        kahoot_out = output_dir / f"{slug}_kahoot.csv"
        to_kahoot_csv(quiz_data, str(kahoot_out))
        print(f"[OK] Kahoot CSV format: {kahoot_out}")
        
    if args.target in ["paper", "all"]:
        paper_out = output_dir / f"{slug}_paperclickers.html"
        to_printable_html(quiz_data, str(paper_out))
        print(f"[OK] Printable PaperClickers HTML: {paper_out}")
        
    print("\nAll quiz formats generated successfully!")
    print(f"Files are available in: {output_dir.resolve()}")

if __name__ == "__main__":
    main()
