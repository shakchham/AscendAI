export type MCQQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
};

export const ieltsQuestions: MCQQuestion[] = [
  {
    id: "q1",
    question: "Choose the correct sentence.",
    options: ["He don't like tea.", "He doesn't like tea.", "He not likes tea.", "He didn't likes tea."],
    answer: "He doesn't like tea.",
  },
  {
    id: "q2",
    question: "Select the synonym of 'rapid'.",
    options: ["Slow", "Quick", "Weak", "Late"],
    answer: "Quick",
  },
  {
    id: "q3",
    question: "Pick the correct preposition: She is good ___ mathematics.",
    options: ["in", "at", "on", "for"],
    answer: "at",
  },
  {
    id: "q4",
    question: "Choose the best conclusion sentence for an IELTS essay.",
    options: [
      "To sum up, this issue has both sides but careful policy can balance outcomes.",
      "I think this and that.",
      "No conclusion is needed in essays.",
      "Thanks for reading my essay.",
    ],
    answer: "To sum up, this issue has both sides but careful policy can balance outcomes.",
  },
  {
    id: "q5",
    question: "Identify the grammatically correct sentence.",
    options: [
      "If I will study, I pass the test.",
      "If I study, I will pass the test.",
      "If I studied, I will pass the test.",
      "If I study, I would passed the test.",
    ],
    answer: "If I study, I will pass the test.",
  },
];
