# Columbia/Barnard Network Visualization

A visualization tool for the Columbia/Barnard community to explore the "Six Degrees of Separation" experiment, showing how people are connected through email forwards.

## 📖 Background  

### 🔍 Six Degrees of Separation & Small-World Experiment  
The **Six Degrees of Separation** theory proposes that any two people are connected through at most 6 social links. First introduced by **Frigyes Karinthy** in 1929, this idea suggests that a short chain of acquaintances can bridge vast social distances.  

In the 1960s, **Stanley Milgram's Small-World Experiment** tested this theory by having participants pass letters to a target person through personal contacts. On average, it took **5 to 6 steps** to reach the recipient, supporting the concept of a highly interconnected world.  

## 🔗 About This Project  

This project is a **replication study** within the **Columbia/Barnard community** focusing on smaller communities where there are fewer variables to consider (school affiliation, academic year, language).

The experiment is testing how quickly messages can reach target individuals through email forwards in our community.

## 📊 Features

- Interactive force-directed graph visualization using D3.js
- Color nodes by different attributes (email sequence, major, school, year, language)
- Zoom and pan controls for exploring the network
- Automatic handling of multi-attribute nodes (multiple majors or languages)
- Tooltips with detailed information about each person
- Dynamic legend that updates based on the selected attribute

## 🔄 Data Import

The application can automatically import data from CSV files using the included processing script.

### CSV Format

The CSV file should have the following headers:

```
Timestamp,School,Year (Class of ),Major,Languages You Speak (Rank by Frequency),UNI,Next Person(s) UNI
```

Example:
```
2/21/2025 11:18:44,SEAS,2027,Mechanical Engineering,English,sr4101,ss6679
2/21/2025 16:09:21,CC,2027,Creative Writing,"English, Greek, Spanish",dk3344,"sr4101, tgz2103"
```

### Processing Data

1. Place your CSV file in the `data` folder or any location of your choice
2. Run the processing script:

```bash
# Using npm script
npm run process-data data/sample.csv

# Or directly with bash
./script/processData.sh data/sample.csv
```

This will:
1. Parse the CSV data
2. Generate a network graph data structure
3. Save it to `src/data/network_data.json`
4. Extract unique majors and languages for the dynamic legend
5. Save them to `src/data/unique_majors.json` and `src/data/unique_languages.json`

### Automatic Color Assignment

The visualization will automatically assign colors to new majors and languages that appear in your data. The color schemes are:

- **Email Sequence**: Red for first forwards, orange for second forwards, black dashed lines for direct connections
- **Schools**: SEAS (blue), CC (red), Barnard (green)
- **Years**: 2025 (purple), 2026 (blue), 2027 (red)
- **Dynamic colors**: For majors and languages not already defined in the system

## 🚀 Development

1. Install dependencies: `npm install`
2. Process your data: `npm run process-data your-data.csv` 
3. Start the development server: `npm start`
4. Open [http://localhost:3000](http://localhost:3000) to view it in your browser

## 🌐 Deployment

The project is configured for GitHub Pages deployment:

```bash
npm run deploy
```

## 📝 Trial History Overview

| Trial  | Date  | Target | Initial Recipients         | Conversion Step          | Success Rate  |
|--------|-------|--------|---------------------------|--------------------------|--------------|
| Trial 1 | Feb 20  | 1  | Random people              | Forward 1                | 0/50         |
| Trial 2 | Feb 21  | 1  | Physics/Humanities class   | Forward 1 / Forward 2    | 2/73 / 1/2   |
| Trial 3 | Mar 1   | 2  | Sociology class           | Forward 1                | 1/23         |
| Trial 4 | Mar 2   | 2  | Philosophy class          | Forward 1                | 1/79         |
| Trial 5 | Mar 6   | 3  | Political science class   | Forward 1 / Forward 2    | 2/88 / 1/1   |

(For more detailed trial information, see [Trials detail.txt](https://github.com/C171017/Social-Network-Columbia-Barnard-/blob/main/Trials%20detail.txt).)

## 🛠️ Technologies

- React
- D3.js
- CSV Parser