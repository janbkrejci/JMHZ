import json
import random
import datetime

def generate_rc(yy, mm, dd):
    base = int(f"{yy:02d}{mm:02d}{dd:02d}")
    for i in range(10000):
        candidate = int(f"{base}{i:04d}")
        if candidate % 11 == 0:
            return str(candidate)
    return str(base) + "0000000000"[:10-len(str(base))]

def get_enum_value(ciselnik_key, enums, exclude=None):
    if ciselnik_key in enums:
        options = enums[ciselnik_key]
        candidate_options = [opt['value'] for opt in options if opt['value'] != ""]
        
        if exclude:
            original_len = len(candidate_options)
            candidate_options = [v for v in candidate_options if v not in exclude]
            if not candidate_options and original_len > 0:
                print(f"WARNING: Exclusion of {exclude} resulted in empty options for {ciselnik_key}. Reverting to valid option.")
                candidate_options = [opt['value'] for opt in options if opt['value'] != ""]

        if candidate_options:
            if 'AD' in candidate_options: return 'AD'
            return candidate_options[0]
            
    return "UNKNOWN"

def generate_value(node, enums, exclude_vals=None):
    widget = node.get("widget", "input")
    key = node.get("key", "unknown")
    field_id = node.get("id")
    
    # Specific overrides
    if field_id == '10057': return generate_rc(85, 1, 1) # Male 1985
    if field_id == '10056': return "1985-01-01"
    if field_id == '10059': return "M" 
    
    val = f"Test {key}" 

    if widget == 'date':
        val = "2025-01-01"
    elif widget == 'number':
        val = "123"
    elif widget == 'selection' or widget == 'combobox':
        ciselnik = node.get('ciselnik')
        if ciselnik:
            val = get_enum_value(ciselnik, enums, exclude=exclude_vals)
    
    return val

def traverse_and_fill(nodes, enums, data, mode):
    if isinstance(nodes, list):
        for node in nodes:
            traverse_and_fill(node, enums, data, mode)
    elif isinstance(nodes, dict):
        if nodes.get("skip") is True:
            return

        is_leaf = "children" not in nodes or not nodes["children"]
        if is_leaf:
            field_id = nodes.get("id")
            widget = nodes.get("widget", "input")
            
            # Identify Default
            default_val = nodes.get("default_value", "")
            if field_id == '10067': 
                default_val = "CZ"
                
            has_default = default_val != ""
            
            should_add = True
            final_val = None
            
            if field_id and widget not in ['separator', 'markdown', 'title', 'label', 'html']:
                if has_default:
                    if mode == 'implicit_default':
                        should_add = False
                    elif mode == 'explicit_default':
                        final_val = default_val
                    elif mode == 'non_default':
                        final_val = generate_value(nodes, enums, exclude_vals=[default_val])
                else:
                    final_val = generate_value(nodes, enums)
                
                if should_add and final_val is not None:
                    data[field_id] = final_val

        if "children" in nodes:
            traverse_and_fill(nodes["children"], enums, data, mode)

try:
    with open('../docs/regzec_form.json', 'r') as f:
        structure = json.load(f)
    with open('../docs/regzec_enums.json', 'r') as f:
        enums = json.load(f)

    scenarios = []
    modes = [
        ("non_default", "Set 1 (Non-Default)"),
        ("explicit_default", "Set 2 (Explicit Default)"),
        ("implicit_default", "Set 3 (Implicit Default)")
    ]

    for m, label in modes:
        d = {}
        traverse_and_fill(structure, enums, d, m)
        scenarios.append({
            "name": m,
            "label": label,
            "data": d
        })
    
    with open('test_scenarios.json', 'w') as f:
        json.dump(scenarios, f, indent=2, ensure_ascii=False)
        
    print("Scenarios generated.")

except Exception as e:
    import traceback
    traceback.print_exc()
