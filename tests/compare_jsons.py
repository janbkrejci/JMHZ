import json
import sys
import argparse

def deep_compare(obj1, obj2, path="root"):
    """
    Recursively compares two objects.
    Returns None if equal, or error string if different.
    ignores key order in dicts (inherent to Python dicts).
    """
    if type(obj1) != type(obj2):
        return f"{path}: Type mismatch ({type(obj1).__name__} vs {type(obj2).__name__})"

    if isinstance(obj1, dict):
        keys1 = set(obj1.keys())
        keys2 = set(obj2.keys())
        
        missing_in_2 = keys1 - keys2
        missing_in_1 = keys2 - keys1
        
        if missing_in_2:
            return f"{path}: Keys missing in second file: {missing_in_2}"
        if missing_in_1:
            return f"{path}: Keys missing in first file: {missing_in_1}"
            
        for k in keys1:
            diff = deep_compare(obj1[k], obj2[k], path=f"{path}.{k}")
            if diff:
                return diff
                
    elif isinstance(obj1, list):
        if len(obj1) != len(obj2):
            return f"{path}: List length mismatch ({len(obj1)} vs {len(obj2)})"
        
        for i, (item1, item2) in enumerate(zip(obj1, obj2)):
            diff = deep_compare(item1, item2, path=f"{path}[{i}]")
            if diff:
                return diff
                
    else:
        if obj1 != obj2:
            return f"{path}: Value mismatch ({repr(obj1)} vs {repr(obj2)})"

    return None

def main():
    parser = argparse.ArgumentParser(description="Compare two JSON files recursively, ignoring key order.")
    parser.add_argument("file1", help="First JSON file path")
    parser.add_argument("file2", help="Second JSON file path")
    
    args = parser.parse_args()
    
    try:
        with open(args.file1, 'r', encoding='utf-8') as f1:
            data1 = json.load(f1)
        with open(args.file2, 'r', encoding='utf-8') as f2:
            data2 = json.load(f2)
            
        diff = deep_compare(data1, data2)
        
        if diff is None:
            print("OK: Files are identical (recursively).")
        else:
            print("FAIL: Files differ.")
            print(diff)
            sys.exit(1)
            
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(2)

if __name__ == "__main__":
    main()
