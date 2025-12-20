import json
import sys
from compare_jsons import deep_compare

FILE_FIELDS = ['999102', '999103', '999104', '999146', '999145', '999105']

def main():
    try:
        with open('tests/full_data.json', 'r') as f:
            data_orig = json.load(f)
        with open('test-results/downloads/chromium/scenario__set_1__non_default__step1.json', 'r') as f:
            data_saved = json.load(f)
            
        # Remove file fields from both
        for k in FILE_FIELDS:
            if k in data_orig: del data_orig[k]
            if k in data_saved: del data_saved[k]
            
        diff = deep_compare(data_orig, data_saved)
        
        if diff is None:
            print("OK: Files match (excluding file fields).")
        else:
            print("FAIL: Files differ (excluding file fields).")
            print(diff)
            sys.exit(1)
            
    except Exception as e:
        print(e)
        sys.exit(2)

if __name__ == "__main__":
    main()
