import json
import sys

def to_printable_html(universal_quiz: dict, output_path: str):
    letters = ['A', 'B', 'C', 'D', 'E', 'F']
    
    html = f'''<!DOCTYPE html>
<html lang=\"pt-BR\">
<head>
<meta charset=\"UTF-8\">
<title>{universal_quiz.get('title', 'Wizard Quiz')}</title>
<style>
  body {{ font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #222; }}
  h1 {{ color: #0d47a1; margin-bottom: 5px; }}
  .meta {{ color: #555; font-size: 14px; margin-bottom: 25px; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
  .question-block {{ margin-bottom: 25px; page-break-inside: avoid; background: #fafafa; padding: 15px; border-radius: 8px; border-left: 5px solid #0d47a1; }}
  .q-title {{ font-size: 16px; font-weight: bold; margin-bottom: 10px; }}
  .options {{ list-style-type: none; padding-left: 0; }}
  .options li {{ margin-bottom: 6px; padding: 6px 12px; background: #fff; border: 1px solid #ddd; border-radius: 4px; }}
  .letter {{ font-weight: bold; color: #0d47a1; margin-right: 8px; }}
  .teacher-key {{ margin-top: 40px; page-break-before: always; background: #e8f5e9; padding: 20px; border-radius: 8px; }}
  .key-item {{ margin-bottom: 12px; }}
  .exp {{ font-size: 13px; color: #2e7d32; margin-top: 3px; }}
</style>
</head>
<body>
  <h1>{universal_quiz.get('title', 'Wizard Quiz')}</h1>
  <div class=\"meta\">
    <strong>Livro:</strong> {universal_quiz.get('book', '')} | 
    <strong>Unidade:</strong> {universal_quiz.get('unit', '')} | 
    <strong>Nível:</strong> {universal_quiz.get('level', '')} |
    <strong>Instrução:</strong> Levante seu cartão PaperClickers com a letra correspondente virada para CIMA.
  </div>
'''

    for idx, q in enumerate(universal_quiz.get("questions", []), 1):
        html += f'''  <div class=\"question-block\">
    <div class=\"q-title\">{idx}. {q.get('question')}</div>
    <ul class=\"options\">
'''
        for o_idx, opt in enumerate(q.get("options", [])):
            let = letters[o_idx] if o_idx < len(letters) else str(o_idx)
            html += f'''      <li><span class=\"letter\">[{let}]</span> {opt}</li>\n'''
        html += '''    </ul>\n  </div>\n'''

    # Teacher Key section
    html += '''  <div class=\"teacher-key\">
    <h2>Gabarito do Professor & Análise Pedagógica</h2>\n'''
    for idx, q in enumerate(universal_quiz.get("questions", []), 1):
        c_idx = q.get("correct_answer", 0)
        let = letters[c_idx] if isinstance(c_idx, int) and c_idx < len(letters) else str(c_idx)
        opt_text = q.get("options", [])[c_idx] if isinstance(c_idx, int) and c_idx < len(q.get("options", [])) else ""
        exp = q.get("explanation", "")
        html += f'''    <div class=\"key-item\">
      <strong>Questão {idx}:</strong> Letra [{let}] - {opt_text}
      <div class=\"exp\">💡 <em>Feedback: {exp}</em></div>
    </div>\n'''
    
    html += '''  </div>\n</body>\n</html>'''

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"Generated Printable PaperClickers Sheet: {output_path}")

if __name__ == '__main__':
    if len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            data = json.load(f)
        out = sys.argv[2] if len(sys.argv) > 2 else "printable_quiz.html"
        to_printable_html(data, out)
