import json
import random
import datetime

def generate_rc(yy, mm, dd):
    base = int(f"{yy:02d}{mm:02d}{dd:02d}")
    for i in range(10000):
        candidate = int(f"{base}{i:04d}")
        if candidate % 11 == 0:
            return str(candidate)
    return str(base) + "0000" # fallback

def get_enum_value(ciselnik_key, enums, exclude=None):
    if ciselnik_key in enums:
        options = enums[ciselnik_key]
        valid_options = [opt['value'] for opt in options if opt['value'] != ""]
        if exclude:
            valid_options = [v for v in valid_options if v not in exclude]
        
        if valid_options:
            return valid_options[0] # Pick first for determinism, or random?
            # User wants "something other than CZ" for state.
            # Let's pick 'DE' if available, or just first non-CZ.
    return "UNKNOWN"

def traverse_and_fill(nodes, enums, data):
    if isinstance(nodes, list):
        for node in nodes:
            traverse_and_fill(node, enums, data)
    elif isinstance(nodes, dict):
        if nodes.get("skip") is True:
            return

        is_leaf = "children" not in nodes or not nodes["children"]
        if is_leaf:
            field_id = nodes.get("id")
            widget = nodes.get("widget", "input")
            key = nodes.get("key")
            
            if field_id and widget not in ['separator', 'markdown', 'title', 'label']:
                # Default Value Generation
                val = f"Test {key}" 
                
                # Logic based on widget or semantics
                if widget == 'date':
                    val = "2025-01-01"
                elif widget == 'number':
                    val = "123"
                elif widget == 'selection' or widget == 'combobox':
                    ciselnik = nodes.get('ciselnik')
                    if ciselnik:
                        exclude = []
                        if ciselnik == 'state':
                            exclude = ['CZ']
                            
                        val = get_enum_value(ciselnik, enums, exclude)
                
                # Specific Field Overrides
                if field_id == '10057': # RČ
                    val = generate_rc(85, 1, 1) # Male 1985
                if field_id == '10056': # Birthdate
                    val = "1985-01-01"
                    
                # Store
                data[field_id] = val
        
        if "children" in nodes:
            traverse_and_fill(nodes["children"], enums, data)

# Main execution
try:
    with open('docs/regzec_form.json', 'r') as f:
        structure = json.load(f)
    with open('docs/regzec_enums.json', 'r') as f:
        enums = json.load(f)
        
    full_data = {}
    traverse_and_fill(structure, enums, full_data)
    
    print(json.dumps(full_data, indent=2, ensure_ascii=False))
    
except Exception as e:
    import traceback
    traceback.print_exc()
