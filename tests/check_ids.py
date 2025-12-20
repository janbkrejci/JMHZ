import json
import sys

def check_json(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error reading file: {e}")
        return

    ids = {}
    missing_id_nodes = []
    
    # Widget types to ignore for ID check
    IGNORED_WIDGETS = {'markdown', 'separator'}
    
    valid_nodes = []

    def traverse(node, path=""):
        if isinstance(node, dict):
            # Check for skip logic
            if node.get('skip') is True:
                return

            # Check for ID logic
            has_id = 'id' in node and str(node['id']).strip() != ""
            
            # Check if leaf node (no children or children list is empty)
            is_leaf = True
            if 'children' in node and isinstance(node['children'], list) and len(node['children']) > 0:
                is_leaf = False
            
            if is_leaf:
                if not has_id:
                    widget_type = node.get("widget", "").lower()
                    # Check if we should ignore this widget type
                    if widget_type not in IGNORED_WIDGETS and "separator" not in widget_type:
                         missing_id_nodes.append({
                            "path": path,
                            "key": node.get("key", "N/A"),
                            "description": node.get("description", "N/A"),
                            "widget": widget_type
                        })
                else:
                    valid_nodes.append({
                        "path": path,
                        "id": node['id'],
                        "label": node.get('description') or node.get('label') or node.get('key', 'N/A')
                    })

            if has_id:
                node_id = str(node['id'])
                if node_id in ids:
                    ids[node_id].append(path)
                else:
                    ids[node_id] = [path]
            
            # Continue traversal
            for key, value in node.items():
                if key == 'children':
                    new_path = f"{path}.children" if path else "children"
                    traverse(value, new_path)
        elif isinstance(node, list):
            for i, item in enumerate(node):
                new_path = f"{path}[{i}]"
                traverse(item, new_path)

    traverse(data)
    
    # Report Valid Leaves
    print(f"INFO: Found {len(valid_nodes)} valid leaf nodes with IDs:")
    for v in valid_nodes:
        print(f"  {v['id']}: {v['label']}")
    print("-" * 20)
    
    # Report Duplicates
    duplicates = {k: v for k, v in ids.items() if len(v) > 1}
    
    errors_found = False
    
    if duplicates:
        print(f"FAIL: Found {len(duplicates)} duplicate IDs:")
        for doc_id, paths in duplicates.items():
            print(f"  ID '{doc_id}' found at:")
            for p in paths:
                print(f"    - {p}")
        print("-" * 20)
        errors_found = True
    else:
        print("PASS: All found IDs are unique.")

    # Report Missing IDs on Leaves
    if missing_id_nodes:
        print(f"FAIL: Found {len(missing_id_nodes)} leaf nodes without an ID (excluding ignored widgets):")
        for node in missing_id_nodes:
            print(f"  Path: {node['path']}")
            print(f"    Key: {node['key']}")
            print(f"    Desc: {node['description']}")
            print(f"    Widget: {node['widget']}")
            print("-" * 10)
        errors_found = True
    else:
        print("PASS: All non-skipped leaf nodes have IDs.")

    if not errors_found:
       print("SUCCESS: JSON structure validation passed.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_ids.py <file_path>")
    else:
        check_json(sys.argv[1])
