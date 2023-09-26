import pandas as pd
import json
import sys

print("Running process_csv.py")


def clean_header(header):
    return header.strip().replace(" ", "_").replace("\n", "").replace('"', '')


def load_custom_csv_with_columns(file_path, column_names, skip_rows=2):
    df = pd.read_csv(file_path, skiprows=skip_rows)
    df.columns = [clean_header(col) for col in df.columns]
    return df


if __name__ == '__main__':
    manual_column_names = [
        'Co', 'ID', 'Name', 'Department', 'HireDate', 'PeriodBegin', 'PeriodEnd',
        'CheckDate', 'E-2RegHours', 'E-3OTHours', 'E-WALIWALI', 'E-WALISALWALISAL'
    ]

    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        print("No file path provided.")
        sys.exit(1)

    try:
        df = load_custom_csv_with_columns(file_path, manual_column_names)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    # Ensure the DataFrame has the expected columns
    for col in manual_column_names:
        if col not in df.columns:
            print(f"Error: Missing expected column {col}")
            sys.exit(1)

    json_output = df.to_json(orient='records')
    print(json_output)
