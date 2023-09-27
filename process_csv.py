import pandas as pd
import json
import sys

# Comment out or remove the following line
# print("Running process_csv.py", file=sys.stderr)  # Now it will print to stderr instead of stdout


def clean_header(header):
    return str(header).strip().replace(" ", "_").replace("\n", "").replace('"', '')


def concatenate_headers(header_rows):
    headers = []
    for col in header_rows.columns:
        # Get the values from the first and second rows for this column
        first_row_value = header_rows.at[0, col]
        second_row_value = header_rows.at[1, col]

        # Ignore empty values in the first row
        if pd.isna(first_row_value) or first_row_value == 'nan':
            header_value = clean_header(second_row_value)
        else:
            # Concatenate the first and second row values
            concatenated_value = f"{first_row_value} {second_row_value}"
            # Remove any undesired substrings
            cleaned_value = concatenated_value.replace(
                '___Hours', '').replace(' ', '_')
            header_value = clean_header(cleaned_value)

        # Special handling for the last four headers
        if header_value.endswith('___Hours_'):
            header_value = header_value.replace(
                '___Hours_', '').replace('_', '')

            # Remove any single quotes from the header_value
        header_value = header_value.replace("'", "")

        headers.append(header_value)

    return headers

# ... rest of your code ...


def map_headers(headers):
    header_mapping = {
        'E-2RegHrs': 'E-2RegHours',
        'E-3OTHrs': 'E-3OTHours',
        'E-WALIWALI': 'E-WALIWALI',
        'E-WALISalWALISal': 'E-WALISALWALISAL',
        'Co': 'Co',
        'ID': 'ID',
        'Name': 'Name',
        'Department': 'Department',
        'Hire_Date': 'HireDate',
        'Period_Begin': 'PeriodBegin',
        'Period_End': 'PeriodEnd',
        'Check_Date': 'CheckDate'
    }
    return [header_mapping.get(header, header) for header in headers]


def load_and_process_csv(file_path):
    # Read the first two rows to get the header information
    header_rows = pd.read_csv(file_path, nrows=2, header=None)

    # Read the rest of the data
    data = pd.read_csv(file_path, skiprows=2, header=None)

    # Concatenate headers and assign to data DataFrame
    concatenated_headers = concatenate_headers(header_rows)
    mapped_headers = map_headers(concatenated_headers)
    data.columns = mapped_headers

    # Drop the 'First_Check_Date' column if it exists
    if 'First_Check_Date' in data.columns:
        data = data.drop(columns=['First_Check_Date'])

    return data


if __name__ == '__main__':
    if len(sys.argv) > 1:
        file_path = sys.argv[1]
    else:
        print("No file path provided.", file=sys.stderr)
        sys.exit(1)

    try:
        df = load_and_process_csv(file_path)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    json_output = df.to_json(orient='records', date_format='iso')
    print(json_output)
