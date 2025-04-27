⸻

🔗 Social Network Visualization

[Click here to see the Visualization](https://c171017.github.io/Social-Network-Columbia-Barnard/)

data process demo

[![Watch the demo](https://img.youtube.com/vi/xUFHHwJHPC0/hqdefault.jpg)](https://youtu.be/xUFHHwJHPC0)
⸻

📖 Background

🔍 Six Degrees of Separation & Small-World Experiment

The Six Degrees of Separation theory proposes that any two people are connected through at most 6 social links. First introduced by Frigyes Karinthy in 1929, this idea suggests that a short chain of acquaintances can bridge vast social distances.

In the 1960s, Stanley Milgram’s Small-World Experiment tested this theory by having participants pass letters to a target person through personal contacts. On average, it took 5 to 6 steps to reach the recipient, supporting the concept of a highly interconnected world.

⸻

🔗 About This Project

This project is a replication study within the Columbia/Barnard community, focusing on a smaller, controlled social network.
We explore the structure of connections based on variables such as school affiliation, academic year, and language.

The experiment is still under development, testing different forwarding mechanisms and network behaviors.

⸻

🛠 Data Processing Pipeline

1. convert.js – Pre-Cleaning & ID Encoding

convert.js prepares raw data for graph generation by:

Stage	What happens
0. Run it	node convert.js rawdata.csv → outputs out.csv.
1. Collision-free UNI encoding	Converts ab1234, cde9876 into unique 9-digit IDs like 123404217 using mapping.json.
2. Row “explosion”	Expands rows with multiple groups or receivers into separate rows, each with one group and one Next UNI.
3. Timestamp parsing	Parses YYYY/MM/DD HH:MM:SS AM/PM AST timestamps for proper sorting.
4. Sorting	Rows are sorted by Group and then by timestamp (oldest → newest).
5. Output	Writes the cleaned, sorted data to out.csv.

Why this step is needed:
	•	Ensures unique 9-digit IDs for every UNI.
	•	Simplifies multi-group and multi-recipient rows.
	•	Guarantees a deterministic order for further processing.

⸻

2. processData.js – Graph Building

This script transforms out.csv into src/data/network_data.json for visualization.

🔄 Steps:
	1.	Read & Sort CSV
	•	Rows sorted by Group → Timestamp.
	•	Each row: one sender (UNI), one receiver (Next UNI or blank).
	2.	Build the Graph
	•	Each unique 9-digit ID = a node.
	•	Merges duplicate nodes; combines all Group values like "2,3".
	•	Each row becomes a directed edge {src, tgt, group}.
	3.	Depth Labelling per Group
For each group:
	•	Build its sub-graph.
	•	Collapse cycles using Tarjan SCC → each cycle becomes a single unit.
	•	Compute hop count for edges with BFS.
	•	Assign first, second, … tenth (cap at tenth).
	4.	Write JSON
	•	Ensures src/data/ exists.
	•	Outputs:

{
  "nodes": [ { id, major, school, year, language, group }, … ],
  "links": [ { source, target, type, group }, … ]
}



⸻

💡 Why This Works:
	•	Per-group hop counters reset, so chains in different groups start fresh.
	•	Cycles are compressed to a single hop to prevent infinite loops.
	•	Fast: linear-time performance with Tarjan + BFS, even with branches/merges.

⸻

🚀 Visualization & Demo

(Demo video – will update later)

⸻

📂 Data Process Demo
	1.	Start with rawdata.csv – formatted like data.csv but includes real UNI values (not public for privacy).
	2.	Run: node convert.js rawdata.csv → creates out.csv.
	3.	Run: node processData.js out.csv → outputs network_data.json.

⸻

⚠ Future Improvements
	•	Consider changing the forwarding mechanism or shifting focus to purely network structure to improve participation/conversion.
	•	Improve label display logic and enable auto-resize of the container.

⸻


## 🕵️‍♀️ Problem & Improvement

* **Low Forward 1 conversion rate**  

Guess 1. People didn't notice it

Guess 2. People didn't open it

* **Relatively Higher Forward 2 conversion rate**

Guess 3. People are more willing to respond to email from friends: 2 > 1

Current strategy: Expand the initial recipient pool & maintain high post converion rate.

* **Potential Problem**

Guess 4. The time to send email matters, people may not check email from Friday to Sunday

(**Conversion rate = Responses / Emails Sent**)  

## 🌚 Finding

# Experiment Development History

## 📊 Trial Conversion Rates  

| Trial  | Date  | Target | Initial Recipients         | Conversion Step          | Success Rate  |
|--------|-------|--------|---------------------------|--------------------------|--------------|
| Trial 1 | Feb 20  | 1  | Random people              | Forward 1                | 0/50         |
| Trial 2 | Feb 21  | 1  | Physics/Humanities class   | Forward 1 / Forward 2    | 2/73 / 1/2   |
| Trial 3 | Mar 1   | 2  | Sociology class           | Forward 1                | 1/23         |
| Trial 4 | Mar 2   | 2  | Philosophy class          | Forward 1                | 1/79         |
| Trial 5 | Mar 6   | 3  | Political science class   | Forward 1 / Forward 2    | 2/88 / 1/1   |
| Trial 6 | Apr 2   | 4  | Freshman                  | Forward 1 / Forward 2    | 2/200 / 1/12   |

## 📝 Trial History Overview

(For a detailed email, see [Trials detail.txt](https://github.com/C171017/Social-Network-Columbia-Barnard-/blob/main/Trials%20detail.txt).)

### 1️⃣ Trial 1
**Date:** Thu, Feb 20  
**Target:** 1  
**Initial Recipients:** Random people  
**Conversion Rate:**  
- Forward 1: 0/50  

---

### 2️⃣ Trial 2
**Date:** Fri, Feb 21  
**Target:** 1  
**Initial Recipients:** Students in an intro physics/humanities class  
**Conversion Rate:**  
- Forward 1: 2/73  
- Forward 2: 1/2  

**Changes Made:**  
- Added a website link at the end of the email.  
- At the time, the website only displayed basic text and was under construction.

---

### 3️⃣ Trial 3
**Date:** Sat, Mar 1  
**Target:** 2  
**Initial Recipients:** Students from an intro sociology class  
**Conversion Rate:**  
- Forward 1: 1/23  

**Changes Made:**  
- Introduced emojis for a more engaging and informal tone.  
- Adjusted email language to be more casual and conversational.

---

### 4️⃣ Trial 4
**Date:** Sun, Mar 2  
**Target:** 2  
**Initial Recipients:** Students from a philosophy class  
**Conversion Rate:**  
- Forward 1: 1/79  

**Changes Made:**  
- Updated the website.  

**Feedback Received:**  
1. Many people didn't look up their email which may explains the big discrepancy between the conversion rate in 1st forward and 2nd.  
2. Concerns were raised that the email could be perceived as stalking since it did not explicitly state that the target was a volunteer participant.  
3. Lack of clarity led some recipients to think they received the email by mistake.

---

### 5️⃣ Trial 5
**Target:** 3  
(Additional details pending)



### 6️⃣ Trial 6
**Date:** Wed, Apr 2  
**Target:** 4  
**Initial Recipients:** Freshman
**Conversion Rate:**  
- Forward 1: 3/200  
- Forward 2: 1/12

**Complete Chain:**
Amount: 1 Step: 2

**Changes Made:**  
- Email rewrite to be concise
- Developed way to automatic add recipient by using tiny task(Windows)
