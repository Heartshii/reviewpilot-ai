type PremiumFlag = {
  premiumAiEnabled?: boolean | null;
};

export function getStandardAiModel() {
  return process.env.OPENAI_STANDARD_MODEL?.trim() || "gpt-4o-mini";
}

export function getPremiumAiModel() {
  return process.env.OPENAI_PREMIUM_MODEL?.trim() || "gpt-4o";
}

export function getAiModelForWorkspace(workspace?: PremiumFlag | null) {
  return workspace?.premiumAiEnabled ? getPremiumAiModel() : getStandardAiModel();
}
