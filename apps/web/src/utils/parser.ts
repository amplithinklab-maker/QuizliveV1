import type { Quiz, Question } from "../types";

// Generates a simple ID
const generateId = () => Math.random().toString(36).substring(2, 9);

export function parseQuizInput(input: string): Quiz | null {
    try {
        // Try to parse as JSON first
        const parsed = JSON.parse(input);
        if (parsed.title && Array.isArray(parsed.questions)) {
            return {
                title: parsed.title,
                questions: parsed.questions.map((q: any) => ({
                    id: q.id || generateId(),
                    text: q.text || "Untitled Question",
                    options: (q.options || []).map((o: any) => ({
                        id: o.id || generateId(),
                        text: o.text || "Untitled Option"
                    })),
                    durationSeconds: q.durationSeconds || null
                }))
            };
        }
    } catch (e) {
        // Not JSON, fallback to text parsing
    }

    // Text parser logic:
    // Title: My Quiz Title
    // Q: Question text?
    // - Option 1
    // - Option 2
    // Q: Another Question?
    // - Option A
    // - Option B

    const lines = input.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return null;

    const quiz: Quiz = {
        title: "Untitled Quiz",
        questions: []
    };

    let currentQuestion: Question | null = null;

    for (const line of lines) {
        if (line.toLowerCase().startsWith('title:')) {
            quiz.title = line.substring(6).trim();
        } else if (line.toLowerCase().startsWith('q:')) {
            if (currentQuestion) {
                quiz.questions.push(currentQuestion);
            }
            currentQuestion = {
                id: generateId(),
                text: line.substring(2).trim(),
                options: []
            };
        } else if (line.startsWith('-')) {
            if (!currentQuestion) {
                currentQuestion = {
                    id: generateId(),
                    text: "Untitled Question",
                    options: []
                };
            }
            currentQuestion.options.push({
                id: generateId(),
                text: line.substring(1).trim()
            });
        }
    }

    if (currentQuestion) {
        quiz.questions.push(currentQuestion);
    }

    // Set defaults for minimal valid structure
    if (quiz.title === "Untitled Quiz" && quiz.questions.length > 0 && quiz.questions[0].text !== "Untitled Question") {
        quiz.title = "LiveQuiz Activity";
    }

    return quiz;
}
