# Summora AI – AI Notes Summarizer & Exam Analyzer

> **Tagline:** *"Turn your notes into exam-ready knowledge."*

**Summora AI** is a complete, responsive, student-friendly web application designed for college students who need to study large volumes of lecture notes quickly and efficiently before examinations.

---

## 🌟 Key Features

1. **Modern Dashboard & Statistics**:
   - Clean SaaS-style interface with stat cards (Notes Analyzed, Important Topics, Questions Generated, Revision Progress).
   - Recent Notes section with instant analysis modal viewer.

2. **Dual Notes Input Methods**:
   - **File Upload**: Drag-and-drop box accepting PDF, DOCX, TXT, and Image files.
   - **Textarea Paste**: Paste lecture notes with real-time character counter and clear button.
   - Metadata inputs for **Subject Name** and target **Exam Date**.

3. **Selectable AI Analysis Modules**:
   - ☑ Summary
   - ☑ Extract Important Topics
   - ☑ Identify Key Definitions
   - ☑ Generate Exam Questions
   - ☑ Generate Revision Notes
   - ☑ Identify Difficult Concepts
   - ☑ Generate Flashcards

4. **Complete Exam-Oriented Results Suite**:
   - **AI Summary**: Short summary, main concepts, and important exam points with 1-click clipboard copy.
   - **Important Topics**: Priority badges (`HIGH`, `MEDIUM`, `LOW`) with detailed explanation.
   - **Key Definitions**: Term, definition, and real-world example cards.
   - **Predicted Exam Questions**: Categorized into 2-Mark, 5-Mark, 10-Mark, and 15-Mark questions with difficulty badges (`Easy`, `Medium`, `Hard`) and disclaimer.
   - **Quick Revision Notes**: High-yield bullet points for last-minute cramming.
   - **Topics You May Need to Review**: Difficult concepts explained in simple student-friendly plain English.
   - **Interactive 3D Flashcards**: Flip cards with CSS 3D transforms, next/previous navigation, and card counter.

5. **Contextual AI Chatbot (Summora)**:
   - Floating chatbot assistant bottom-right.
   - Preset quick-prompt chips (*"What is the most important topic?"*, *"Explain this concept simply"*, *"Give me a 5-mark question"*, etc.).
   - Answers strictly based on uploaded notes. If information is not found in notes, it clearly states: *"I couldn't find this information in your uploaded notes."*

6. **Utility & Personalization**:
   - **Download Study Pack**: Exports complete analysis into a `.txt` study pack file.
   - **Global Search**: Search box filtering and keyword highlighting (`<mark>`).
   - **Dark / Light Theme Toggle**: Persistent theme state using `localStorage`.
   - **Offline / Demo Mode**: Built-in realistic sample data fallback when backend or API key is not configured.

---

## 🛠️ Technologies Used

- **Frontend**: HTML5, Vanilla CSS3 (Custom Properties, Glassmorphism, HSL Tailored Palettes, CSS Grid/Flexbox), Vanilla JavaScript (ES6+).
- **Icons & Typography**: Font Awesome 6.5.1, Google Fonts (`Outfit` & `Inter`).
- **Backend API Proxy**: Node.js & Express (`server.js`).
- **LLM Engine**: Google Gemini API (`gemini-3.5-flash-lite`, `gemini-3.5-flash`).

---

## 📂 Project Structure

```
thiya/
├── index.html         # Main Application Structure & Views
├── style.css          # Design System, Themes, Glassmorphism & 3D Cards
├── script.js          # Core Vanilla JS Logic, State, Chatbot & Parser
├── server.js          # Node.js Express Backend Proxy for Gemini API
├── package.json       # Project Dependencies & Scripts
├── .env.example       # Sample Environment Variable Template
└── README.md          # Project Documentation
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js (v18 or higher recommended)
- NPM (Node Package Manager)

### Step 1: Install Dependencies
Open your terminal in the project directory and run:
```bash
npm install
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Open `.env` and verify your **Gemini API Key**:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```

### Step 3: Start the Backend Server
Run:
```bash
npm start
```
Or for development auto-reload:
```bash
npm run dev
```

### Step 4: Open in Browser
Visit `http://localhost:3000` in your web browser.

---

## 💡 Live Gemini API Mode vs Demo Mode

- **Live Mode**: When `GEMINI_API_KEY` is provided in `.env` and `server.js` is running via `npm start`, Summora AI parses files (PDF, DOCX, TXT, Images) and calls Gemini models for live, customized examination insights.
- **Demo Mode**: If the server is offline or no API key is detected, the application automatically provides high-yield sample study material so studying is never interrupted.

---

## 📝 License

This project is open-source under the MIT License.
