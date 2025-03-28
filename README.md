[Click here to see the Visualization](https://c171017.github.io/Social-Network-Columbia-Barnard/)
Newest updates:

Added black border to mark the boundary.

Added script to automatically load the data.

(Gradually refining now, once the mechanism is well-developed. You can deploy it at any other institution.)

Things need to be fixed
1. Label display logic
2. Auto resize the container

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
