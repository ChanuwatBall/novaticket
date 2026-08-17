import { supabase } from "@/supabase/client";
import type { PublicCompanyConfig } from "@/services/api";

const COMPANY_STORAGE_KEY = "company";

export const getStoredCompany = () => {
  try {
    const companyStr = localStorage.getItem(COMPANY_STORAGE_KEY);
    return companyStr ? JSON.parse(companyStr) : null;
  } catch (error) {
    console.error("Failed to parse company from localStorage:", error);
    return null;
  }
};

export const storeCompany = (company: unknown) => {
  if (!company) return;
  localStorage.setItem(COMPANY_STORAGE_KEY, JSON.stringify(company));
};

export const storeCompanyConfig = (config: PublicCompanyConfig) => {
  const current = getStoredCompany();
  const currentRecord = current && typeof current === "object" ? current : {};

  // Keep legacy company fields (including sales settings), while making the
  // public configuration available to ticket and payment code.
  storeCompany({
    ...currentRecord,
    companySettings: config.companySettings || null,
    branding: config.branding || null,
    theme: config.theme || null,
    config_version: config.config_version,
    config_updated_at: config.config_updated_at,
  });
};

export const loadCompany = async () => {
  const storedCompany = getStoredCompany();
  if (storedCompany) return storedCompany;

  const companyName = import.meta.env.VITE_COMPANY_NAME;
  if (!companyName) return null;

  const { data: company, error } = await supabase
    .from("companies")
    .select(`
      *,
      company_sales_settings (
        *
      )
    `)
    .eq("name", companyName)
    .single();

  if (error) {
    console.error("Failed to load company", error);
    return null;
  }

  storeCompany(company);
  return company;
};
