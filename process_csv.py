import pandas as pd
import json
import sys  # Import the sys module


def clean_header(header):
    """
    Clean up the header name by removing spaces, line breaks, and special characters.
    """
    return header.strip().replace(" ", "_").replace("\n", "")


def load_custom_csv_with_columns(file_path, column_names, skip_rows=4):
    """
    Load a custom-formatted CSV file into a Pandas DataFrame with manually set column names.
    """
    df = pd.read_csv(file_path, skiprows=skip_rows, names=column_names)

    # Clean up the column names
    df.columns = [clean_header(col) for col in df.columns]

    return df


if __name__ == '__main__':
    # Manually set column names
    manual_column_names = [
        'Co', 'ID', 'Name', 'Department', 'HireDate', 'FirstCheckDate', 'PeriodBegin', 'PeriodEnd',
        'CheckDate', 'E-2RegHours', 'E-3OTHours', 'E-WALIWALI', 'E-WALISALWALISAL'
    ]

    # Read the file path from command-line arguments
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        print("No file path provided.")
        sys.exit(1)

    # Load the data
    df = load_custom_csv_with_columns(file_path, manual_column_names)

    # Convert the DataFrame to JSON
    json_output = df.to_json(orient='records')

    # Output the JSON string
    print(json_output)
