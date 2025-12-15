import pandas as pd

EXCEL_FILE = 'RegZec_V50_2025.xlsx'

try:
    xl = pd.ExcelFile(EXCEL_FILE)
    print("Sheet names:")
    for sheet in xl.sheet_names:
        print(f"- {sheet}")
except Exception as e:
    print(f"Error reading excel file: {e}")
