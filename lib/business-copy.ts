export const BUSINESS_TYPES = [
  "RESTAURANT",
  "DENTAL_CLINIC",
  "GROCERY_STORE",
  "SALON_SPA",
  "FITNESS_STUDIO",
  "HOME_SERVICE",
  "AUTOMOTIVE_SERVICE",
  "RETAIL_STORE",
  "PROFESSIONAL_SERVICE",
  "GENERAL_SERVICE",
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_OPTIONS: { value: BusinessType; label: string }[] = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "DENTAL_CLINIC", label: "Dental clinic" },
  { value: "GROCERY_STORE", label: "Grocery store" },
  { value: "SALON_SPA", label: "Salon or spa" },
  { value: "FITNESS_STUDIO", label: "Fitness studio" },
  { value: "HOME_SERVICE", label: "Home service" },
  { value: "AUTOMOTIVE_SERVICE", label: "Automotive service" },
  { value: "RETAIL_STORE", label: "Retail store" },
  { value: "PROFESSIONAL_SERVICE", label: "Professional service" },
  { value: "GENERAL_SERVICE", label: "General service business" },
];

type BusinessLabels = {
  businessType: BusinessType;
  businessLabel: string;
  businessLabelPlural: string;
  customerLabel: string;
  customerLabelPlural: string;
  workspaceLabel: string;
  visitLabel: string;
  visitLabelPlural: string;
  spendLabel: string;
};

const BUSINESS_LABELS: Record<BusinessType, BusinessLabels> = {
  RESTAURANT: {
    businessType: "RESTAURANT",
    businessLabel: "restaurant",
    businessLabelPlural: "restaurants",
    customerLabel: "guest",
    customerLabelPlural: "guests",
    workspaceLabel: "restaurant workspace",
    visitLabel: "visit",
    visitLabelPlural: "visits",
    spendLabel: "bill amount",
  },
  DENTAL_CLINIC: {
    businessType: "DENTAL_CLINIC",
    businessLabel: "clinic",
    businessLabelPlural: "clinics",
    customerLabel: "patient",
    customerLabelPlural: "patients",
    workspaceLabel: "clinic workspace",
    visitLabel: "appointment",
    visitLabelPlural: "appointments",
    spendLabel: "visit total",
  },
  GROCERY_STORE: {
    businessType: "GROCERY_STORE",
    businessLabel: "store",
    businessLabelPlural: "stores",
    customerLabel: "shopper",
    customerLabelPlural: "shoppers",
    workspaceLabel: "store workspace",
    visitLabel: "visit",
    visitLabelPlural: "visits",
    spendLabel: "basket total",
  },
  SALON_SPA: {
    businessType: "SALON_SPA",
    businessLabel: "studio",
    businessLabelPlural: "studios",
    customerLabel: "client",
    customerLabelPlural: "clients",
    workspaceLabel: "studio workspace",
    visitLabel: "appointment",
    visitLabelPlural: "appointments",
    spendLabel: "service total",
  },
  FITNESS_STUDIO: {
    businessType: "FITNESS_STUDIO",
    businessLabel: "studio",
    businessLabelPlural: "studios",
    customerLabel: "member",
    customerLabelPlural: "members",
    workspaceLabel: "studio workspace",
    visitLabel: "session",
    visitLabelPlural: "sessions",
    spendLabel: "session total",
  },
  HOME_SERVICE: {
    businessType: "HOME_SERVICE",
    businessLabel: "service business",
    businessLabelPlural: "service businesses",
    customerLabel: "customer",
    customerLabelPlural: "customers",
    workspaceLabel: "service workspace",
    visitLabel: "job",
    visitLabelPlural: "jobs",
    spendLabel: "job total",
  },
  AUTOMOTIVE_SERVICE: {
    businessType: "AUTOMOTIVE_SERVICE",
    businessLabel: "shop",
    businessLabelPlural: "shops",
    customerLabel: "customer",
    customerLabelPlural: "customers",
    workspaceLabel: "shop workspace",
    visitLabel: "service visit",
    visitLabelPlural: "service visits",
    spendLabel: "service total",
  },
  RETAIL_STORE: {
    businessType: "RETAIL_STORE",
    businessLabel: "store",
    businessLabelPlural: "stores",
    customerLabel: "shopper",
    customerLabelPlural: "shoppers",
    workspaceLabel: "store workspace",
    visitLabel: "purchase",
    visitLabelPlural: "purchases",
    spendLabel: "purchase total",
  },
  PROFESSIONAL_SERVICE: {
    businessType: "PROFESSIONAL_SERVICE",
    businessLabel: "practice",
    businessLabelPlural: "practices",
    customerLabel: "client",
    customerLabelPlural: "clients",
    workspaceLabel: "practice workspace",
    visitLabel: "appointment",
    visitLabelPlural: "appointments",
    spendLabel: "service total",
  },
  GENERAL_SERVICE: {
    businessType: "GENERAL_SERVICE",
    businessLabel: "business",
    businessLabelPlural: "businesses",
    customerLabel: "customer",
    customerLabelPlural: "customers",
    workspaceLabel: "business workspace",
    visitLabel: "visit",
    visitLabelPlural: "visits",
    spendLabel: "visit total",
  },
};

export function getBusinessLabels(businessType?: string | null): BusinessLabels {
  if (!businessType) {
    return BUSINESS_LABELS.GENERAL_SERVICE;
  }

  return (
    BUSINESS_LABELS[businessType as BusinessType] ??
    BUSINESS_LABELS.GENERAL_SERVICE
  );
}

export function titleCaseLabel(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
