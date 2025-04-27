[Click here to see the Visualization](https://c171017.github.io/Social-Network-Columbia-Barnard/)

How the current CSV → network-JSON script works

This is a plain-English walkthrough of the algorithm we have right now (before the 9-digit-ID upgrade).
You can drop it straight into README.md.

⸻

1.  Pre-processing
	1.	Read the CSV (out.csv) into memory.
	2.	Sort rows
	•	first by Group (ascending 1 → 2 → 3 …),
	•	then within each group by timestamp, newest first (so the most recent activity is processed first).

⸻

2.  Per-row handling (inside each group)

For every unprocessed row we do:

Step	Action
a. Start / reset a chain pointer	We store the row’s UNI (the sender) in a single “container” variable.
This variable always points to the node we’re currently following backward through the chain.	
b. Create a link	A JSON link object is written:
{ "source": current UNI, "target": Next UNI, "type": "first" }	
c. Bump the previous link in this chain	If we already created a link in this chain during the previous iteration, we upgrade its "type" one level (first → second → third → …).
d. Mark the row processed	So we won’t touch it again.
e. Advance the pointer	The container now holds this row’s UNI (the sender).
f. Look-back search	We scan earlier rows (still within the same group, older timestamps) until we find the next row whose Next UNI equals the container.
If we find one, we go back to b with that matching row.	
If none is found, we treat the next “newest unprocessed row” as the start of a new chain.	

3.  Moving on

When every row in the current group is flagged “processed,” we jump to the next group and repeat the whole routine.

⸻

What the mechanism gets right
	•	Simple chains (A → B → C → D) are labelled neatly:
	•	A→B = first, B→C = second, C→D = third…
	•	Processing newest-first means we never miss the latest forwarding events.
	•	The code path is O(n²) in the worst case but works fine on classroom-sized CSVs.

⸻

Known flaws & edge-case trouble

Category	What can go wrong	Result
Branching (fan-out / fan-in)	The same sender forwards to two different receivers in separate rows or two different senders forward to the same receiver.	Duplicate “first” links on parallel branches; depth counts (first/second/ …) no longer reflect real hop distance.
Loops / cycles	Rows create a loop like A→B, B→A, or longer cycles.	Link types get assigned in reverse order (newer link becomes second, older stays first). A longer loop can cause excessive bumping or even an endless look-back without a “visited” guard.
Single global pointer	Only one “container” variable tracks the last link. When two chains merge, the algorithm can’t tell which previous link belongs to which chain.	Depth bumps the wrong edge, giving mixed-up first/second/third labels.
No cap for >10 hops	We only have typeNames = ["first", …, "tenth"].	An 11-step chain silently stops bumping at “tenth”.
Performance on large files	Each look-back is a linear scan.	O(n²) runtime could bite if the CSV grows to tens of thousands of rows.
Upcoming 9-digit IDs	Code still assumes 4-digit strings in a few helper functions.	Will break merges and node look-ups until updated.



⸻

Summary

The current script is fine for straight, non-branching forwarding chains and modest datasets.
To handle real-world data—with possible branches, merges, and loops—we’ll need to:
	1.	Track multiple active chains at once (e.g., a map from current node → last link).
	2.	Keep a visited-node set per chain to stop infinite cycles.
	3.	Treat 9-digit IDs everywhere (string keys, no length assumption).
	4.	Consider a true graph traversal (BFS/DFS) if we ever want iron-clad depth labels.



Things need to be fixed

Encontering people with the same 4 digits identifers. need to update processData.js

Conversion rate remain low-considering a change in forwarding mechanism or shifting the focus of the study to the network structure solely.

1. Label display logic
2. Auto resize the container

## Data Process Demo

[![Watch the demo](https://img.youtube.com/vi/cU5vb4ojLHo/hqdefault.jpg)](https://youtu.be/cU5vb4ojLHo)

## 📖 Background  

### 🔍 Six Degrees of Separation & Small-World Experiment  
The **Six Degrees of Separation** theory proposes that any two people are connected through at most 6 social links. First introduced by **Frigyes Karinthy** in 1929, this idea suggests that a short chain of acquaintances can bridge vast social distances.  

In the 1960s, **Stanley Milgram’s Small-World Experiment** tested this theory by having participants pass letters to a target person through personal contacts. On average, it took **5 to 6 steps** to reach the recipient, supporting the concept of a highly interconnected world.  

---

## 🔗 About This Project  

This project is a **replication study** with in **Columbia/Barnard community** focusing on smaller communities where there are less variables to concern. (**school affiliation, academic year, anguage**)  

The experiment is still **under development**, testing the most executable **mechanisms**.

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
