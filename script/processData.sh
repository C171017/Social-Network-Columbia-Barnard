#!/bin/bash

# Check if a CSV file is provided
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <path-to-csv-file>"
    exit 1
fi

# Get the CSV file path
CSV_FILE=$1

# Check if the CSV file exists
if [ ! -f "$CSV_FILE" ]; then
    echo "Error: CSV file '$CSV_FILE' not found"
    exit 1
fi

# Check if we need to install csv-parser
if ! npm list csv-parser > /dev/null 2>&1; then
    echo "Installing csv-parser..."
    npm install csv-parser
fi

# Run the data processor
echo "Processing data from $CSV_FILE..."
node script/processData.js "$CSV_FILE"

# Check if the processing was successful
if [ $? -eq 0 ]; then
    echo "Data processing completed successfully."
    echo "You can now run 'npm start' to view the visualization."
else
    echo "Error: Data processing failed."
    exit 1
fi