import pandas as pd

def load_custom_csv_with_columns(file_path, column_names, skip_rows=4):
    """
    Load a custom-formatted CSV file into a Pandas DataFrame with manually set column names.

    Parameters:
        file_path (str): The path to the CSV file.
        column_names (list): List of column names to set in the DataFrame.
        skip_rows (int): The number of rows to skip at the start of the file.

    Returns:
        pd.DataFrame: A Pandas DataFrame containing the loaded data.
    """
    df = pd.read_csv(file_path, skiprows=skip_rows, names=column_names)
    return df


# Manually set column names
manual_column_names = [
    'Company_ID', 'Employee_ID', 'Employee_Name', 'Department_ID',
    'Hire_Date', 'First_Check_Date', 'Period_Begin', 'Period_End',
    'Check_Date', 'Regular_Hours', 'OT_Hours', 'WALISal'
]

# Manually set composite column names based on metadata
manual_composite_names = {
    'Regular_Hours': 'E-2 Reg Hrs',
    'OT_Hours': 'E-3 OT Hrs',
    'WALISal': 'E-WALISal WALISal'
}

# Update the manual_column_names list
for col, new_name in manual_composite_names.items():
    index = manual_column_names.index(col)
    manual_column_names[index] = new_name

# File path
file_path = '/Volumes/LaCie/Clients/LCR Capital/LCR_data_files/Alahaina, LLC_39890_end date 02.01.2023.xlsx - Sheet1.csv'

# Load the data
df = load_custom_csv_with_columns(file_path, manual_column_names)

# Do something with the DataFrame
print(df.head())
