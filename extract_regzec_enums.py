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
EXCEL_FILE_2 = 'jmhz datová věta.xlsx'
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
        
        # Select column 0 (Value) and column 2 (Label)
        df = df.iloc[:, [0, 2]]
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

    # 4. Tax Identification (CIS Typ daňové identifikace)
    try:
        print("Extracting 'tax_identification' from CIS Typ daňové identifikace...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Typ daňové identifikace', header=None)
        
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
        
        enums['tax_identification'] = df.to_dict('records')
        print(f"Extracted {len(enums['tax_identification'])} tax_identification entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Typ daňové identifikace: {e}")

    # 5. Document Type (CIS Typ dokladu)
    try:
        print("Extracting 'typ_dokladu' from CIS Typ dokladu...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Typ dokladu', header=None)
        
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
        
        enums['typ_dokladu'] = df.to_dict('records')
        print(f"Extracted {len(enums['typ_dokladu'])} typ_dokladu entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Typ dokladu: {e}")

    # 6. Health Insurance (C_ZPOJ)
    try:
        print("Extracting 'zdravotni_pojistovny' from C_ZPOJ...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='C_ZPOJ', header=None)
        
        # Skip first row (header)
        df = df.iloc[1:]
        
        # Select first 2 columns
        df = df.iloc[:, :2]
        df.columns = ['value', 'label']
        
        # Clean data
        df['value'] = df['value'].astype(str).str.strip()
        df['label'] = df['label'].astype(str).str.strip()
        
        # Format label: "Code - Name"
        df['label'] = df['value'] + " - " + df['label']

        # Filter valid
        df = df[df['value'] != 'nan']
        
        enums['zdravotni_pojistovny'] = df.to_dict('records')
        print(f"Extracted {len(enums['zdravotni_pojistovny'])} zdravotni_pojistovny entries.")
        
    except Exception as e:
        print(f"Error extracting C_ZPOJ: {e}")

    # 7. Pension Type (C_DUCH)
    try:
        print("Extracting 'druh_duchodu' from C_DUCH...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='C_DUCH', header=None)
        
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
        
        enums['druh_duchodu'] = df.to_dict('records')
        print(f"Extracted {len(enums['druh_duchodu'])} druh_duchodu entries.")
        
    except Exception as e:
        print(f"Error extracting C_DUCH: {e}")

    # 8. Education (CIS Kategorie dosaženého vzdělá)
    try:
        print("Extracting 'vzdelani' from CIS Kategorie dosaženého vzdělá...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Kategorie dosaženého vzdělá', header=None)
        
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
        
        enums['vzdelani'] = df.to_dict('records')
        print(f"Extracted {len(enums['vzdelani'])} vzdelani entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Kategorie dosaženého vzdělá: {e}")

    # 9. Health Limitations (CIS Zdravotní omezení)
    try:
        print("Extracting 'zdravotni_omezeni' from CIS Zdravotní omezení...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Zdravotní omezení', header=None)
        
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
        
        enums['zdravotni_omezeni'] = df.to_dict('records')
        print(f"Extracted {len(enums['zdravotni_omezeni'])} zdravotni_omezeni entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Zdravotní omezení: {e}")

    # 10. Work Permission Type (CIS Druh pracovního oprávnění)
    try:
        print("Extracting 'druh_prac_opravneni' from CIS Druh pracovního oprávnění...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Druh pracovního oprávnění', header=None)
        
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
        
        enums['druh_prac_opravneni'] = df.to_dict('records')
        print(f"Extracted {len(enums['druh_prac_opravneni'])} druh_prac_opravneni entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Druh pracovního oprávnění: {e}")

    # 11. Access Reason (CIS Důvod pro volný přístup na)
    try:
        print("Extracting 'duvod_volneho_pristupu' from CIS Důvod pro volný přístup na...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS Důvod pro volný přístup na ', header=None)
        
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
        
        enums['duvod_volneho_pristupu'] = df.to_dict('records')
        print(f"Extracted {len(enums['duvod_volneho_pristupu'])} duvod_volneho_pristupu entries.")
        
    except Exception as e:
        print(f"Error extracting CIS Důvod pro volný přístup na: {e}")

    # 12. Job Offices (CIS krajských poboček ÚP ČR)
    try:
        print("Extracting 'pobocky_uradu_prace' from CIS krajských poboček ÚP ČR...")
        df = pd.read_excel(EXCEL_FILE, sheet_name='CIS krajských poboček ÚP ČR', header=None)
        
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
        
        enums['pobocky_uradu_prace'] = df.to_dict('records')
        print(f"Extracted {len(enums['pobocky_uradu_prace'])} pobocky_uradu_prace entries.")
        
    except Exception as e:
        print(f"Error extracting CIS krajských poboček ÚP ČR: {e}")

    # 13. Child Order (CIS Pořadí dítěte) - From EXCEL_FILE_2
    try:
        print("Extracting 'poradi_deti' from CIS Pořadí dítěte...")
        if os.path.exists(EXCEL_FILE_2):
            df = pd.read_excel(EXCEL_FILE_2, sheet_name='CIS Pořadí dítěte', header=None)
            
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
            
            enums['poradi_deti'] = df.to_dict('records')
            print(f"Extracted {len(enums['poradi_deti'])} poradi_deti entries.")
        else:
            print(f"Warning: {EXCEL_FILE_2} not found, skipping poradi_deti.")
            
    except Exception as e:
        print(f"Error extracting CIS Pořadí dítěte: {e}")

    # 14. Foreign Carrier Spec (CIS Specifikace cizozemského no) - From EXCEL_FILE_2
    try:
        print("Extracting 'specifikace_ciz_nositele' from CIS Specifikace cizozemského no...")
        if os.path.exists(EXCEL_FILE_2):
            df = pd.read_excel(EXCEL_FILE_2, sheet_name='CIS Specifikace cizozemského no', header=None)
            
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
            
            enums['specifikace_ciz_nositele'] = df.to_dict('records')
            print(f"Extracted {len(enums['specifikace_ciz_nositele'])} specifikace_ciz_nositele entries.")
        else:
            print(f"Warning: {EXCEL_FILE_2} not found, skipping specifikace_ciz_nositele.")

    except Exception as e:
        print(f"Error extracting CIS Specifikace cizozemského no: {e}")

    # 4. Bool (Static)
    enums['bool'] = [
        {'value': 'A', 'label': 'ANO'},
        {'value': 'N', 'label': 'NE'}
    ]
    print(f"Added static 'bool' enum.")

    # 5. Rodinny Stav (Static)
    # 0=Nezjištěn, 1=Svobodný/á, 2=Ženatý/Vdaná, 3=Rozvedený/á, 4=Vdovec/Vdova, 5=Registrovaný partner
    enums['rodinny_stav'] = [
        {'value': '0', 'label': 'Nezjištěn'},
        {'value': '1', 'label': 'Svobodný/á'},
        {'value': '2', 'label': 'Ženatý/Vdaná'},
        {'value': '3', 'label': 'Rozvedený/á'},
        {'value': '4', 'label': 'Vdovec/Vdova'},
        {'value': '5', 'label': 'Registrovaný partner'}
    ]
    print(f"Added static 'rodinny_stav' enum.")

    # Save to JSON
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(enums, f, indent=4, ensure_ascii=False)
        
    print(f"Successfully saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    extract_enums()
