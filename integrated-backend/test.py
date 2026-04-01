import json, os

company = 'HDFC'
f = open('outputs/manifest.json')
manifest = json.load(f)
results = [e for e in manifest.get('analyses',[]) if company.lower() in e.get('company','').lower()]
print('Found', len(results), 'results')

print('\n--- Simulating endpoint ---')
try:
    result = {}
    output_dir = os.path.join('outputs', 'HDFC', 'Q3_FY25')
    files = {"esg": "esg_analysis.json", "sentiment": "sentiment_analysis.json",
             "speaker": "speaker_analysis.json", "summary": "summary_analysis.json",
             "metrics": "metrics.json"}
    for key, filename in files.items():
        filepath = os.path.join(output_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, 'r') as fh:
                result[key] = json.load(fh)

    report_path = os.path.join(output_dir, 'summary_report.md')
    if os.path.exists(report_path):
        with open(report_path, 'r') as fh:
            result['report_markdown'] = fh.read()

    for entry in manifest.get('analyses', []):
        ef = entry.get('company', '').replace(' ', '_')
        eq = entry.get('quarter', '') + '_' + entry.get('fiscal_year', '')
        if ef == 'HDFC' and eq == 'Q3_FY25':
            result['headline'] = entry.get('headline', {})
            break

    print('SUCCESS - keys:', list(result.keys()))
    print('DONE')
except Exception as e:
    print('ERROR:', e)
    import traceback
    traceback.print_exc()