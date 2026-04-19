export type University = {
  name: string;
  country: string;
  minIelts: number;
  maxIelts: number;
};

export const universities: University[] = [
  { name: "University of Toronto", country: "Canada", minIelts: 7, maxIelts: 9 },
  { name: "University of Melbourne", country: "Australia", minIelts: 6.5, maxIelts: 9 },
  { name: "University of Auckland", country: "New Zealand", minIelts: 6, maxIelts: 8 },
  { name: "University of Leeds", country: "UK", minIelts: 6.5, maxIelts: 8.5 },
  { name: "Arizona State University", country: "USA", minIelts: 6, maxIelts: 7.5 },
  { name: "University of Glasgow", country: "UK", minIelts: 6.5, maxIelts: 8.5 },
  { name: "Deakin University", country: "Australia", minIelts: 6, maxIelts: 7.5 },
  { name: "University of South Florida", country: "USA", minIelts: 6, maxIelts: 7.5 },
  { name: "University of Windsor", country: "Canada", minIelts: 6.5, maxIelts: 8 },
  { name: "Massey University", country: "New Zealand", minIelts: 6, maxIelts: 7.5 },
];
