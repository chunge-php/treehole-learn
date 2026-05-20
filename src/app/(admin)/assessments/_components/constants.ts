export const DIMENSIONS = ["多元性向量表", "自陈量表", "兴趣量表", "多模态"] as const;
export type AssessmentDimension = typeof DIMENSIONS[number];

export const QTYPES = ["单选题", "判断题", "语音题"] as const;
export type AssessmentQType = typeof QTYPES[number];

// 维度颜色 (用于列表 Badge)
export const DIMENSION_VARIANT: Record<string, any> = {
  "多元性向量表": "default",
  "自陈量表": "info",
  "兴趣量表": "warning",
  "多模态": "secondary"
};

export const QTYPE_VARIANT: Record<string, any> = {
  "单选题": "outline",
  "判断题": "secondary",
  "语音题": "info"
};
