#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = ["pandas", "openpyxl"]
# ///

import pandas as pd
import json
import re

def normalize_key(key):
    if not isinstance(key, str): return f"col_{key}"
    key = str(key).strip().lower()
    table = str.maketrans("áčďéěíňóřšťúůýž", "acdeeinorstuuyz")
    key = key.translate(table)
    key = key.replace('.', '_').replace(' ', '_').replace('-', '_').replace('/', '_')
    key = re.sub(r'[^a-z0-9_]', '', key)
    key = re.sub(r'_+', '_', key).strip('_')
    return key

try:

    # Read Excel
    df = pd.read_excel('regzec.xlsx', sheet_name='Slovník', header=None)
    
    # Headers at row 16 (index 15)
    headers_raw = df.iloc[15].tolist()
    headers_keys = [normalize_key(h) for h in headers_raw]
    
    try:
        name_idx = headers_keys.index('nazev_atributu')
        a1_idx = headers_keys.index('a1_ost')
        id_idx = headers_keys.index('id_polozky_ds') 
        # Optional extra columns
        # D=Dat. typ, E=Delka, F=Spec. pov., G=Log. kontr., H=Vysv.
        # We try to map them by name, fallback to index if needed
        # Expected names: dat_typ, delka, specificke_povinnosti..., logicke_kontroly..., vysvetlivky...
        
        # Columns Y, Z, AA corresponds to indices 24, 25, 26
        # We can try to locate them by header name if possible, otherwise use index
        # Based on user request: P (Y), N (Z), Z (AA)
        # Let's try to find them by normalized index if they exist, or hardcode index if header name is unsure
        
        # Helper to get value securely by header or index
        def get_val(row, identifier):
            idx = -1
            if isinstance(identifier, int):
                idx = identifier
            elif identifier in headers_keys:
                idx = headers_keys.index(identifier)
            
            if 0 <= idx < len(row):
                val = row.iloc[idx]
                return str(val).strip() if not pd.isna(val) else ""
            return ""

    except ValueError as e:
        print(f"Error finding basic columns: {e}")
        exit(1)

    data_rows = df.iloc[16:]
    
    # Collect paths and data
    # We will build a flat list first including split items
    flat_items = []
    
    for idx, row in data_rows.iterrows():
        # Filter by A1-OST
        a1_val = row.iloc[a1_idx]
        if pd.isna(a1_val): continue
        a1_str = str(a1_val).strip().upper()
        if a1_str not in ['P', 'N', 'PP']: continue

        raw_name = row.iloc[name_idx]
        if pd.isna(raw_name): continue
        name = str(raw_name).strip().lower()
        if not name.startswith('employee.'): continue
        
        row_id = str(row.iloc[id_idx] if id_idx < len(row) else "").strip()

        # Extract base data
        item_data = {
            'path': name,
            '_excel_description': get_val(row, 'popis'),
            'dat_typ': get_val(row, 'dat_typ'),
            'delka': get_val(row, 'delka'),
            'specificke_povinnosti': get_val(row, 'specificke_povinnosti_pro_jednotlive_akce'),
            'logicke_kontroly': get_val(row, 'logicke_kontroly'),
            'vysvetlivky': get_val(row, 'vysvetlivky_kvyplneni'),
            'mandatory': a1_str, # Column I (A1-OST)
            'p': get_val(row, 24), # Column Y
            'n': get_val(row, 25), # Column Z
            'z': get_val(row, 26),  # Column AA
            'id': row_id         # Column A (id_polozky_ds)
        }
        
        # Split logic
        if '10057' in row_id and '10058' in row_id:
            # Item 1: BNO
            i1 = item_data.copy()
            i1['path'] = 'employee.client.bno'
            i1['_excel_description'] = "Rodné číslo" 
            i1['id'] = "10057"
            flat_items.append(i1)
            
            # Item 2: ECP
            i2 = item_data.copy()
            i2['path'] = 'employee.client.ecp'
            i2['_excel_description'] = "EČP (Evidenční číslo pojištěnce)"
            i2['id'] = "10058"
            flat_items.append(i2)
        else:
            flat_items.append(item_data)
            
    # Build Tree
    tree = []
    
    def get_or_create_node(node_list, key):
        for node in node_list:
            if node['key'] == key:
                return node
        new_node = {
            "key": key,
            "skip": False,
            "new_only": False,
            "description": "",
            "default_value": "",
            "order": 100,      
            "children": []
        }
        node_list.append(new_node)
        return new_node

    # Sort items by path
    flat_items.sort(key=lambda x: x['path'])
    
    for item in flat_items:
        path = item['path']
        parts = path.split('.')
        
        current_level = tree
        current_path_prefix = ""
        
        for i, part in enumerate(parts):
            if current_path_prefix:
                current_path_prefix += "." + part
            else:
                current_path_prefix = part
                
            node = get_or_create_node(current_level, part)
            node['original_path'] = current_path_prefix
            
            # If this is the leaf (the item itself)
            if i == len(parts) - 1:
                # Add extra columns data
                node['id'] = item['id']
                node['dat_typ'] = item['dat_typ']
                node['delka'] = item['delka']
                node['specificke_povinnosti'] = item['specificke_povinnosti']
                node['logicke_kontroly'] = item['logicke_kontroly']
                node['vysvetlivky'] = item['vysvetlivky']
                
                # New attributes (UI Config - Defaults)
                node['widget'] = "input"
                node['width'] = 12
                node['manual_parent'] = ""
                node['ciselnik'] = ""
                node['default_value'] = ""
                
                node['mandatory'] = item['mandatory']
                node['p'] = item['p']
                node['n'] = item['n']
                node['z'] = item['z']
                
                # Assign excel description if node description is empty
                if not node['description']:
                    node['description'] = item['_excel_description']
            
            current_level = node['children']
            
    # Clean up
    def clean_tree(nodes):
        for node in nodes:
            if not node['children']:
                del node['children']
            else:
                clean_tree(node['children'])
                
    clean_tree(tree)

    # Save
    with open('regzec_structure.json', 'w', encoding='utf-8') as f:
        json.dump(tree, f, ensure_ascii=False, indent=2)
        
    print(f"Success: Generated structure with {len(flat_items)} paths.")

except Exception as e:
    print(f"Error: {e}")
    exit(1)
