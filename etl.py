import sys
import openpyxl
import pandas as pd
import mysql.connector

# Get the path to the Excel file from the command line arguments
file_path = sys.argv[1]

print("Import file: ", file_path)

# Read the Excel file into a pandas DataFrame
df = pd.read_excel(file_path)

# Print the DataFrame with header names but no index
print(df.to_string(header=True, index=False))

# Load the Excel file into memory
# workbook = openpyxl.load_workbook(file_path)

# # Select the first worksheet in the workbook
# worksheet = workbook.active

# # Loop through each row in the worksheet
# for row in worksheet.iter_rows(min_row=2):
#   # Loop through each cell in the row
#   for cell in row:
#     # Check the data type of the cell value and output to the console
#     if isinstance(cell.value, str):
#       print(f'{cell.coordinate}: {cell.value} (string)')
#     elif isinstance(cell.value, int):
#       print(f'{cell.coordinate}: {cell.value} (integer)')
#     elif isinstance(cell.value, float):
#       print(f'{cell.coordinate}: {cell.value} (float)')
#     elif isinstance(cell.value, bool):
#       print(f'{cell.coordinate}: {cell.value} (boolean)')
#     elif cell.value is None:
#       print(f'{cell.coordinate}: {cell.value} (empty)')
#     else:
#       print(f'{cell.coordinate}: {cell.value} (unknown)')
