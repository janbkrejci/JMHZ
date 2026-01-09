import json
import os

def extract_ids_and_desc(node, items_list):
    """
    Recursively extracts 'id' and 'description' (or 'label') from a node and its children.
    """
    if isinstance(node, dict):
        if 'id' in node and node['id']:
            desc = node.get('description') or node.get('label') or "No description"
            items_list.append({'id': node['id'], 'desc': desc})
        
        # Recurse into children if present
        if 'children' in node and isinstance(node['children'], list):
            for child in node['children']:
                extract_ids_and_desc(child, items_list)
        
    elif isinstance(node, list):
        for item in node:
            extract_ids_and_desc(item, items_list)

def main():
    json_path = 'docs/regzec_form.json'
    
    if not os.path.exists(json_path):
        print(f"File not found: {json_path}")
        return

    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        all_items = []
        extract_ids_and_desc(data, all_items)
        
        # Separate into numeric and string IDs for sorting
        numeric_items = []
        string_items = []
        
        for item in all_items:
            try:
                # Try to convert ID to int for sorting
                numeric_val = int(item['id'])
                numeric_items.append({'id_val': numeric_val, 'original_id': item['id'], 'desc': item['desc']})
            except ValueError:
                string_items.append(item)
                
        # Sort numeric items descending by numeric value
        numeric_items.sort(key=lambda x: x['id_val'], reverse=True)
        
        # Sort string items descending by ID string
        string_items.sort(key=lambda x: x['id'], reverse=True)
        
        print(f"{'ID':<10} | Description")
        print("-" * 50)
        
        for item in numeric_items:
            print(f"{item['original_id']:<10} | {item['desc']}")
            
        if string_items:
            print("\n--- Non-Numeric IDs ---")
            for item in string_items:
                print(f"{item['id']:<10} | {item['desc']}")
                
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    main()
