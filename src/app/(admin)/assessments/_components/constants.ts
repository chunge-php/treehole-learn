export type AssessmentDimension = "learning_attitude" | "learning_method" | "learning_ability" | "learning_habit";
export type AssessmentQType = "single" | "multiple" | "text";

export const DIMENSION_LABEL: Record<AssessmentDimension, string> = {
  learning_attitude: "学习态度",
  learning_method: "学习方法",
  learning_ability: "学习能力",
  learning_habit: "学习习惯"
};

export const QTYPE_LABEL: Record<AssessmentQType, string> = {
  single: "单选",
  multiple: "多选",
  text: "简答"
};
