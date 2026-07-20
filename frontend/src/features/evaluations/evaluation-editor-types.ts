export type EditableCriterionScore = {
  score: string;
  comment: string;
};

export type EditableScoreMap = Record<
  string,
  EditableCriterionScore
>;
