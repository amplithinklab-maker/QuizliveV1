# LiveQuizV1

A minimalist, real-time formative assessment tool designed for university classrooms. Inspired by Mentimeter, focused on **pedagogical** use: no scores, no rankings, no gamification. Purely for **cognitive activation**, **discussion**, and **aggregated feedback**.

## Features

- Real-time WebSocket synchronization (Socket.io)
- Host presenter view with live horizontal bar charts
- Student mobile-friendly view with large option buttons
- Ephemeral sessions — no data persists after closing
- Supports up to 100 simultaneous connections
- Clean, projector-friendly design (pure white, high contrast)
- Quiz input via JSON or structured text

## Architecture

```
LiveQuizV1/
├── apps/
│   ├── web/        # React + Vite + TypeScript (frontend)
│   └── server/     # Express + Socket.io + TypeScript (backend)
└── package.json    # npm workspaces root
```

## Quick Start (Local)

### Prerequisites
- Node.js 18+ installed

### 1. Install dependencies
```bash
cd LiveQuizV1
npm install
```

### 2. Start the backend
```bash
npm run dev:server
```
Server starts at `http://localhost:3001`

### 3. Start the frontend (separate terminal)
```bash
npm run dev:web
```
Frontend starts at `http://localhost:5173`

### 4. Use it
1. Open `http://localhost:5173` — click **Create Activity (Host)**
2. Paste a quiz (see examples below) and click **Create & Present**
3. Share the Room PIN with students
4. Students go to `http://localhost:5173/join/XXXXXX` and enter their name
5. Click **Start Activity** when ready!

## Quiz Format

### JSON Format
```json
{
  "title": "Introduction to AI",
  "questions": [
    {
      "text": "What does AI stand for?",
      "options": [
        { "text": "Artificial Intelligence" },
        { "text": "Automated Inference" },
        { "text": "Abstract Information" }
      ],
      "durationSeconds": 30
    },
    {
      "text": "Which is a machine learning paradigm?",
      "options": [
        { "text": "Supervised Learning" },
        { "text": "Magical Learning" },
        { "text": "Quantum Guessing" },
        { "text": "Abstract Reasoning" }
      ],
      "durationSeconds": 30
    }
  ]
}
```

### Text Format
```
Title: Introduction to AI

Q: What does AI stand for?
- Artificial Intelligence
- Automated Inference
- Abstract Information

Q: Which is a machine learning paradigm?
- Supervised Learning
- Magical Learning
- Quantum Guessing
- Abstract Reasoning
```

## Example Quizzes

### Short Quiz (3 questions)
```json
{
  "title": "Research Methods Quick Check",
  "questions": [
    {
      "text": "Which of these is a qualitative research method?",
      "options": [
        { "text": "In-depth interview" },
        { "text": "A/B testing" },
        { "text": "Regression analysis" }
      ]
    },
    {
      "text": "What does 'p < 0.05' indicate?",
      "options": [
        { "text": "Statistical significance" },
        { "text": "Large sample size" },
        { "text": "High reliability" },
        { "text": "External validity" }
      ]
    },
    {
      "text": "Which sampling technique is most prone to bias?",
      "options": [
        { "text": "Convenience sampling" },
        { "text": "Stratified random sampling" },
        { "text": "Simple random sampling" }
      ]
    }
  ]
}
```

### Medium Quiz (6 questions)
```json
{
  "title": "Data Science Fundamentals",
  "questions": [
    {
      "text": "What type of variable is 'temperature in Celsius'?",
      "options": [
        { "text": "Interval" },
        { "text": "Nominal" },
        { "text": "Ordinal" },
        { "text": "Ratio" }
      ]
    },
    {
      "text": "Which measure of central tendency is most affected by outliers?",
      "options": [
        { "text": "Mean" },
        { "text": "Median" },
        { "text": "Mode" }
      ]
    },
    {
      "text": "What does a correlation of r = -0.95 indicate?",
      "options": [
        { "text": "Strong negative linear relationship" },
        { "text": "Weak positive relationship" },
        { "text": "No relationship" },
        { "text": "Perfect positive relationship" }
      ]
    },
    {
      "text": "Which visualization is best for showing distribution?",
      "options": [
        { "text": "Histogram" },
        { "text": "Pie chart" },
        { "text": "Line chart" },
        { "text": "Scatter plot" }
      ]
    },
    {
      "text": "What is the purpose of cross-validation?",
      "options": [
        { "text": "Estimate model generalization" },
        { "text": "Increase training speed" },
        { "text": "Reduce dataset size" },
        { "text": "Visualize feature importance" }
      ]
    },
    {
      "text": "Which algorithm is fundamentally a 'lazy learner'?",
      "options": [
        { "text": "K-Nearest Neighbors" },
        { "text": "Decision Tree" },
        { "text": "Logistic Regression" },
        { "text": "Neural Network" }
      ]
    }
  ]
}
```

## Deployment

### Frontend (Static)
Build the frontend to static files:
```bash
npm run build:web
```
Output is in `apps/web/dist/`. Deploy to any static hosting (Netlify, Vercel, GitHub Pages, etc.)

**Important**: Set the `SERVER_URL` in `apps/web/src/utils/socket.ts` to your backend URL before building.

### Backend
Build and run the server:
```bash
npm run build:server
cd apps/server
node dist/index.js
```
Set the `PORT` environment variable if needed (default: 3001).

## Design Principles

- **White, clean, minimal** — no gradients, no glowing effects
- **Projector-friendly** — readable from 5+ meters
- **Pedagogically focused** — no correct answers shown, no scores, no ranking
- **Ephemeral** — nothing persists, no accounts, no history
- **Immediate** — usable within 10 seconds, no setup required
