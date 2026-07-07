export const getOCREngine = async () => {
  try {
    const dynamicImport = new Function("moduleName", "return import(moduleName);");
    const module = await dynamicImport("client-side-ocr").catch(() => null);
    return module?.createOCREngine ?? null;
  } catch {
    return null;
  }
};

export const normalizeOcrText = (value: string | null | undefined) => {
  if (!value) return "";

  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF\u200E\u200F]/g, "")
    .replace(/[\u202A-\u202E\u2066-\u2069]/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
};
