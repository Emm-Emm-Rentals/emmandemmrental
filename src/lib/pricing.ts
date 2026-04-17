export type TaxLine = {
  code: string;
  label: string;
  rate: number;
  taxableBase: number;
  amount: number;
};

export type DynamicPricingRule = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  nightlyPrice: number;
  priority: number;
  active: boolean;
};

export type NightlyRate = {
  date: string;
  price: number;
  ruleId: string | null;
  label: string | null;
};

export type TaxProfileInputLine = {
  id?: string;
  label: string;
  rate: number;
  appliesTo: "NIGHTLY" | "CLEANING" | "SERVICE" | "ALL";
  order?: number;
  isActive?: boolean;
};

export type TaxProfileInput = {
  id?: string;
  name?: string;
  country?: string;
  state?: string | null;
  county?: string | null;
  city?: string | null;
  vatRate?: number | null;
  gstRate?: number | null;
  lines?: TaxProfileInputLine[];
};

export type PricingInput = {
  nights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  petFee?: number | null;
  pets?: number | null;
  locationValue?: string | null;
  taxPercentage?: number | null;
  taxProfile?: TaxProfileInput | null;
};

export type PricingBreakdown = {
  nightlySubtotal: number;
  petFeeSubtotal: number;
  subtotal: number;
  taxableBase: number;
  totalTaxRate: number;
  taxLines: TaxLine[];
  taxAmount: number;
  total: number;
  vatAmount: number;
  gstAmount: number;
};

export type StayPricingInput = {
  startDate: string | Date;
  endDate: string | Date;
  basePricePerNight: number;
  cleaningFee: number;
  serviceFee: number;
  petFee?: number | null;
  pets?: number | null;
  locationValue?: string | null;
  taxPercentage?: number | null;
  taxProfile?: TaxProfileInput | null;
  dynamicPricingRules?: unknown;
};

export type StayPricingBreakdown = PricingBreakdown & {
  nights: number;
  pricePerNight: number;
  nightlyRates: NightlyRate[];
};

const roundToCurrency = (value: number) => Math.round(value);

const padDatePart = (value: number) => String(value).padStart(2, "0");

const formatLocalDate = (date: Date) => {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const toDateOnly = (value: string | Date) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) return null;
    return formatLocalDate(parsed);
  }

  if (Number.isNaN(value.getTime())) return null;
  return formatLocalDate(value);
};

const enumerateStayDates = (startDate: string | Date, endDate: string | Date) => {
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);
  if (!start || !end || start >= end) return [] as string[];

  const dates: string[] = [];
  const current = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  while (current < last) {
    dates.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
};

export const normalizeDynamicPricingRules = (input: unknown): DynamicPricingRule[] => {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      if (!item || typeof item !== "object") return null;

      const record = item as Record<string, unknown>;
      const startDate = toDateOnly(String(record.startDate || ""));
      const endDate = toDateOnly(String(record.endDate || ""));
      const nightlyPrice = Number(record.nightlyPrice);

      if (!startDate || !endDate || endDate < startDate || !Number.isFinite(nightlyPrice) || nightlyPrice < 0) {
        return null;
      }

      return {
        id: typeof record.id === "string" && record.id.trim() ? record.id.trim() : `rule_${index + 1}`,
        label: typeof record.label === "string" && record.label.trim() ? record.label.trim() : `Rule ${index + 1}`,
        startDate,
        endDate,
        nightlyPrice: roundToCurrency(nightlyPrice),
        priority: Number.isFinite(Number(record.priority)) ? Number(record.priority) : 0,
        active: record.active === false ? false : true,
      };
    })
    .filter((rule): rule is DynamicPricingRule => Boolean(rule))
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.startDate !== b.startDate) return b.startDate.localeCompare(a.startDate);
      return a.id.localeCompare(b.id);
    });
};

export const calculateNightlyRates = ({
  startDate,
  endDate,
  basePricePerNight,
  dynamicPricingRules,
}: {
  startDate: string | Date;
  endDate: string | Date;
  basePricePerNight: number;
  dynamicPricingRules?: unknown;
}): NightlyRate[] => {
  const stayDates = enumerateStayDates(startDate, endDate);
  const rules = normalizeDynamicPricingRules(dynamicPricingRules).filter((rule) => rule.active);
  const fallbackRate = roundToCurrency(Math.max(0, Number(basePricePerNight || 0)));

  return stayDates.map((date) => {
    const matchedRule = rules.find((rule) => date >= rule.startDate && date <= rule.endDate) || null;

    return {
      date,
      price: matchedRule ? matchedRule.nightlyPrice : fallbackRate,
      ruleId: matchedRule?.id || null,
      label: matchedRule?.label || null,
    };
  });
};

const isUsLocation = (locationValue?: string | null) => {
  if (!locationValue) return false;
  const normalized = locationValue.toLowerCase();
  return (
    normalized.includes("united states") ||
    normalized.includes(" usa") ||
    normalized.includes(" us,") ||
    normalized.endsWith(", us") ||
    normalized.includes("u.s.") ||
    normalized.includes("tennessee") ||
    normalized.includes(", tn")
  );
};

const isSeviervilleTn = (locationValue?: string | null) => {
  if (!locationValue) return false;
  const normalized = locationValue.toLowerCase();
  return normalized.includes("sevierville") && (normalized.includes("tennessee") || normalized.includes(", tn") || normalized.includes(" tn "));
};

const calculateBreakdownFromSubtotals = ({
  nightlySubtotal,
  cleaningFee,
  serviceFee,
  petFeeSubtotal = 0,
  locationValue,
  taxPercentage,
  taxProfile,
}: {
  nightlySubtotal: number;
  cleaningFee: number;
  serviceFee: number;
  petFeeSubtotal?: number;
  locationValue?: string | null;
  taxPercentage?: number | null;
  taxProfile?: TaxProfileInput | null;
}): PricingBreakdown => {
  const cleaningSubtotal = roundToCurrency(cleaningFee);
  const serviceSubtotal = roundToCurrency(serviceFee);
  const subtotal = nightlySubtotal + cleaningSubtotal + serviceSubtotal + petFeeSubtotal;
  const taxableBase = subtotal;
  const safeTaxPercentage = Math.max(0, Number(taxPercentage || 0));
  const safeVatRate = Math.max(0, Number(taxProfile?.vatRate || 0));
  const safeGstRate = Math.max(0, Number(taxProfile?.gstRate || 0));

  let taxLines: TaxLine[] = [];
  const activeProfileLines = (taxProfile?.lines || []).filter((line) => line && line.isActive !== false && Number(line.rate) > 0);

  if (activeProfileLines.length > 0) {
    taxLines = [...activeProfileLines]
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((line, index) => {
        const appliesTo = line.appliesTo || "ALL";
        const lineBase = appliesTo === "NIGHTLY"
          ? nightlySubtotal
          : appliesTo === "CLEANING"
            ? cleaningSubtotal
            : appliesTo === "SERVICE"
              ? serviceSubtotal
              : subtotal;

        return {
          code: line.id || `profile_line_${index}`,
          label: line.label,
          rate: Number(line.rate),
          taxableBase: lineBase,
          amount: 0,
        };
      });
  } else if (isSeviervilleTn(locationValue)) {
    taxLines = [
      { code: "sales_tax", label: "Sales tax", rate: 9.75, taxableBase: subtotal, amount: 0 },
      { code: "lodging_tax", label: "Occupancy/Lodging tax", rate: 3, taxableBase: subtotal, amount: 0 },
    ];
  } else if (isUsLocation(locationValue)) {
    taxLines = safeTaxPercentage > 0
      ? [{ code: "sales_tax", label: "Sales tax", rate: safeTaxPercentage, taxableBase: subtotal, amount: 0 }]
      : [];
  } else if (safeTaxPercentage > 0) {
    taxLines = [{ code: "tax", label: "Taxes", rate: safeTaxPercentage, taxableBase: subtotal, amount: 0 }];
  }

  const vatAmount = safeVatRate > 0 ? roundToCurrency(subtotal * (safeVatRate / 100)) : 0;
  const gstAmount = safeGstRate > 0 ? roundToCurrency(subtotal * (safeGstRate / 100)) : 0;
  if (vatAmount > 0) {
    taxLines.push({
      code: "vat",
      label: "VAT",
      rate: safeVatRate,
      taxableBase: subtotal,
      amount: vatAmount,
    });
  }
  if (gstAmount > 0) {
    taxLines.push({
      code: "gst",
      label: "GST",
      rate: safeGstRate,
      taxableBase: subtotal,
      amount: gstAmount,
    });
  }

  taxLines = taxLines.map((line) => ({
    ...line,
    amount: line.amount || roundToCurrency(line.taxableBase * (line.rate / 100)),
  }));

  const taxAmount = taxLines.reduce((sum, line) => sum + line.amount, 0);
  const totalTaxRate = taxLines.reduce((sum, line) => sum + line.rate, 0);
  const total = subtotal + taxAmount;

  return {
    nightlySubtotal,
    petFeeSubtotal,
    subtotal,
    taxableBase,
    totalTaxRate,
    taxLines,
    taxAmount,
    total,
    vatAmount,
    gstAmount,
  };
};

export const calculatePricingBreakdown = ({
  nights,
  pricePerNight,
  cleaningFee,
  serviceFee,
  petFee,
  pets,
  locationValue,
  taxPercentage,
  taxProfile,
}: PricingInput): PricingBreakdown => {
  const nightlySubtotal = roundToCurrency(pricePerNight * nights);
  const petFeeSubtotal = petFee && pets ? roundToCurrency(petFee * pets * nights) : 0;
  return calculateBreakdownFromSubtotals({
    nightlySubtotal,
    cleaningFee,
    serviceFee,
    petFeeSubtotal,
    taxPercentage,
    locationValue,
    taxProfile,
  });
};

export const calculateStayPricingBreakdown = ({
  startDate,
  endDate,
  basePricePerNight,
  cleaningFee,
  serviceFee,
  petFee,
  pets,
  taxPercentage,
  locationValue,
  taxProfile,
  dynamicPricingRules,
}: StayPricingInput): StayPricingBreakdown => {
  const nightlyRates = calculateNightlyRates({
    startDate,
    endDate,
    basePricePerNight,
    dynamicPricingRules,
  });
  const nights = nightlyRates.length;
  const nightlySubtotal = nightlyRates.reduce((sum, night) => sum + night.price, 0);
  const petFeeSubtotal = petFee && pets ? roundToCurrency(petFee * pets * nights) : 0;
  const breakdown = calculateBreakdownFromSubtotals({
    nightlySubtotal,
    cleaningFee,
    serviceFee,
    petFeeSubtotal,
    taxPercentage,
    locationValue,
    taxProfile,
  });

  return {
    ...breakdown,
    nights,
    pricePerNight: nights > 0 ? roundToCurrency(nightlySubtotal / nights) : roundToCurrency(basePricePerNight),
    nightlyRates,
  };
};
