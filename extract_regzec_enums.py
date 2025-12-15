#!/usr/bin/env -S uv run --script
#
# /// script
# requires-python = ">=3.12"
# dependencies = ["pandas", "openpyxl"]
# ///

import pandas as pd
import json
import os

EXCEL_FILE = 'regzec.xlsx'
OUTPUT_FILE = 'docs/regzec_enums.json'

def extract_enums():
    if not os.path.exists(EXCEL_FILE):
        print(f"Error: {EXCEL_FILE} not found.")
        return

    enums = {}
    
    # 1. State (CIS C_STAT)
    try:
        print("Extracting 'state' from CIS C_STAT...")
        # Read without header, assuming data starts immediately or after 1 row? 
        # Requirement: "value je v prvním sloupci (ignoruj řádek záhlaví) a label je ve druhém sloupci"
        # We'll read with header=0 to skip first row, or header=None and skip first row manually.
        # Usually 'header=0' uses first row as header.
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS C_STAT', header=None)
        
        # Skip first row (header)
        df = df.iloc[1:]
        
        # Select first 2 columns
        df = df.iloc[:, :2]
        df.columns = ['value', 'label']
        
        # Clean data
        df['value'] = df['value'].astype(str).str.strip()
        df['label'] = df['label'].astype(str).str.strip()
        
        # Filter valid
        df = df[df['value'] != 'nan']
        
        enums['state'] = df.to_dict('records')
        print(f"Extracted {len(enums['state'])} states.")
        
    except Exception as e:
        print(f"Error extracting CIS C_STAT: {e}")

    # 2. Sex (C_POHL)
    try:
        print("Extracting 'sex' from C_POHL...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='C_POHL', header=None)
        
        # Skip first row (header)
        df = df.iloc[1:]
        
        # Select first 2 columns
        df = df.iloc[:, :2]
        df.columns = ['value', 'label']
        
        # Clean data
        df['value'] = df['value'].astype(str).str.strip()
        df['label'] = df['label'].astype(str).str.strip()
        
        # Filter valid
        df = df[df['value'] != 'nan']
        
        enums['sex'] = df.to_dict('records')
        print(f"Extracted {len(enums['sex'])} sex entries.")
        
    except Exception as e:
        print(f"Error extracting C_POHL: {e}")

    # 3. Sektor (CIS Sektor)
    try:
        print("Extracting 'sector' from CIS Sektor...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Sektor', header=None)
        
        # Skip first row (header)
        df = df.iloc[1:]
        
        # Select first 2 columns
        df = df.iloc[:, :2]
        df.columns = ['value', 'label']
        
        # Clean data
        df['value'] = df['value'].astype(str).str.strip()
        df['label'] = df['label'].astype(str).str.strip()
        
        # Filter valid
        df = df[df['value'] != 'nan']
        
        enums['sector'] = df.to_dict('records')
        print(f"Extracted {len(enums['sector'])} sector entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Sektor: {e}")

    # 4. Bool (Static)
    enums['bool'] = [
        {'value': 'true', 'label': 'ANO'},
        {'value': 'false', 'label': 'NE'}
    ]
    print(f"Added static 'bool' enum.")

    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(enums, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_enums()
