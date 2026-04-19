export type ExamQuestion = {
  id: string;
  question: string;
  options: string[];
  answer: string;
  difficulty: 1 | 2 | 3;
};

export const examBanks: Record<string, ExamQuestion[]> = {
  GMAT: [
    { id: "g1", question: "If x + 2 = 10, x = ?", options: ["6", "8", "10", "12"], answer: "8", difficulty: 1 },
    {
      id: "g2",
      question: "Choose the best correction: Neither of the answers are correct.",
      options: ["Neither of the answers is correct.", "Neither answers is correct.", "Neither answer are correct.", "No change"],
      answer: "Neither of the answers is correct.",
      difficulty: 2,
    },
    { id: "g3", question: "In a set of 5 numbers with mean 20, sum is?", options: ["50", "80", "100", "120"], answer: "100", difficulty: 2 },
  ],
  GRE: [
    { id: "gr1", question: "Antonym of 'opaque' is:", options: ["Cloudy", "Transparent", "Rigid", "Heavy"], answer: "Transparent", difficulty: 1 },
    { id: "gr2", question: "If f(x)=2x+1, f(4) = ?", options: ["7", "8", "9", "10"], answer: "9", difficulty: 1 },
    { id: "gr3", question: "Data interpretation basic trend question.", options: ["A", "B", "C", "D"], answer: "A", difficulty: 2 },
  ],
  PTE: [
    { id: "p1", question: "Identify correct sentence structure.", options: ["A", "B", "C", "D"], answer: "B", difficulty: 1 },
    { id: "p2", question: "Choose the synonym of 'facilitate'.", options: ["Hinder", "Assist", "Forget", "Reduce"], answer: "Assist", difficulty: 1 },
    { id: "p3", question: "Listening comprehension placeholder question.", options: ["A", "B", "C", "D"], answer: "D", difficulty: 2 },
  ],
  IELTS: [
    { id: "i1", question: "Choose correct sentence.", options: ["He don't", "He doesn't", "He not", "He didn't likes"], answer: "He doesn't", difficulty: 1 },
    { id: "i2", question: "Synonym of rapid.", options: ["Slow", "Quick", "Late", "Narrow"], answer: "Quick", difficulty: 1 },
    { id: "i3", question: "Best essay conclusion sentence.", options: ["A", "B", "C", "D"], answer: "A", difficulty: 2 },
  ],
};
