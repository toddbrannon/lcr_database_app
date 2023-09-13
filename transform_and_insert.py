# transform_and_insert.py
import os
from dotenv import load_dotenv
import pandas as pd
import mysql.connector
import sys
from sqlalchemy import create_engine


def transform_data(input_csv):
    # Read the CSV into a DataFrame
    df = pd.read_csv(input_csv)

    # Transformation logic here
    # e.g., df['new_column'] = df['old_column'] * 2

    return df


def validate_data(df):
    # Validation logic here
    # e.g., check for NaNs
    if df.isnull().values.any():
        return False
    return True


def insert_into_db(df):
    # Insert DataFrame into MySQL database
    db_config = {
        'host': os.getenv('AWS_HOST'),
        'user': os.getenv('AWS_USER'),
        'password': os.getenv('AWS_PASS'),
        'database': os.getenv('AWS_DB')
    }

    conn_str = f"mysql+mysqlconnector://{db_config['user']}:{db_config['password']}@{db_config['host']}/{db_config['database']}"
    engine = create_engine(conn_str)

    df.to_sql('your_table', con=engine, if_exists='append', index=False)


def main():
    input_csv = sys.argv[1]

    df = transform_data(input_csv)

    if validate_data(df):
        insert_into_db(df)
        print("Data inserted successfully.")
    else:
        print("Data validation failed.")


if __name__ == '__main__':
    main()
