import { Camera as CapCamera, EncodingType } from "@capacitor/camera";
import { createWorker, PSM } from "tesseract.js";

export type ThaiIDCardData = {
  idNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  expiryDate: string | null;
  expiryDateISO: string | null;
  rawText: string;
};

export type PassportOCRData = {
  passportNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  dateOfBirthISO: string | null;
  expiryDate: string | null;
  expiryDateISO: string | null;
  sex: string | null;
  issuingCountry: string | null;
  mrzLine1: string | null;
  mrzLine2: string | null;
  rawText: string;
};

export type OCRProgressUpdate = {
  progress: number;
  status: string;
};

type ScanOCRParams = {
  rotateDegrees?: number;
  onProgress?: (update: OCRProgressUpdate) => void;
};

type ScanThaiIdCardOCRParams = ScanOCRParams;

export type ScanThaiIdCardOCRResult = {
  cardData: ThaiIDCardData;
  confidence: number;
  rawText: string;
};

export type ScanPassportOCRResult = {
  passportData: PassportOCRData;
  confidence: number;
  rawText: string;
};

const OCR_DEFAULT_STATUS = "กำลังเตรียม OCR...";

export const getDefaultOCRStatus = (): string => OCR_DEFAULT_STATUS;

const emitProgress = (
  onProgress: ScanOCRParams["onProgress"],
  progress: number,
  status: string,
): void => {
  if (!onProgress) {
    return;
  }

  onProgress({
    progress: Math.max(0, Math.min(100, progress)),
    status,
  });
};

const mapTesseractStatus = (
  status: string,
  progress: number,
): OCRProgressUpdate | null => {
  if (status === "recognizing text") {
    return {
      status: "กำลังอ่านข้อความจากบัตร...",
      progress,
    };
  }

  if (status === "loading tesseract core" || status === "loaded tesseract core") {
    return {
      status: "กำลังโหลด OCR core...",
      progress: Math.max(progress, 20),
    };
  }

  if (status === "initializing tesseract" || status === "initialized tesseract") {
    return {
      status: "กำลังเริ่มต้น OCR engine...",
      progress: Math.max(progress, 35),
    };
  }

  if (status === "loading language traineddata") {
    return {
      status: "กำลังโหลดภาษา OCR...",
      progress: Math.max(progress, 45),
    };
  }

  if (status === "loaded language traineddata") {
    return {
      status: "โหลดภาษา OCR แล้ว",
      progress: Math.max(progress, 60),
    };
  }

  return null;
};

export const scanThaiIdCardOCR = async (
  params: ScanThaiIdCardOCRParams = {},
): Promise<ScanThaiIdCardOCRResult> => {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let imageUrl: string | null = null;

  try {
    emitProgress(params.onProgress, 5, "กำลังเตรียมภาพ...");

    const result = await CapCamera.takePhoto({
      quality: 95,
      includeMetadata: true,
      encodingType: EncodingType.JPEG,
    });

    if (!result) {
      throw new Error("ไม่พบผลลัพธ์จากกล้อง");
    }

    const base64Image = result.thumbnail;

    if (!base64Image) {
      throw new Error("ไม่พบข้อมูลรูปภาพใน result.thumbnail");
    }

    const originalBlob = base64ToBlob(base64Image, "image/jpeg");

    if (originalBlob.size === 0) {
      throw new Error("ไฟล์รูปภาพมีขนาด 0 byte");
    }

    const processedBlob = await preprocessIDCard(
      originalBlob,
      params.rotateDegrees ?? 90,
    );

    imageUrl = URL.createObjectURL(processedBlob);

    emitProgress(params.onProgress, 15, "กำลังโหลดโมเดล OCR...");

    worker = await createWorker(["tha", "eng"], 1, {
      logger: (message) => {
        const progress = Math.max(0, Math.min(100, Math.round((message.progress ?? 0) * 100)));
        const mapped = mapTesseractStatus(message.status, progress);

        if (mapped) {
          emitProgress(params.onProgress, mapped.progress, mapped.status);
        }
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    emitProgress(params.onProgress, 70, "กำลังประมวลผลตัวอักษร...");

    const {
      data: { text, confidence },
    } = await worker.recognize(imageUrl);

    const cardData = parseIDData(text);

    emitProgress(params.onProgress, 100, "สแกนเสร็จแล้ว");

    return {
      cardData,
      confidence,
      rawText: text,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
};

export const scanPassportOCR = async (
  params: ScanOCRParams = {},
): Promise<ScanPassportOCRResult> => {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let imageUrl: string | null = null;

  try {
    emitProgress(params.onProgress, 5, "กำลังเตรียมภาพ...");

    const result = await CapCamera.takePhoto({
      quality: 95,
      includeMetadata: true,
      encodingType: EncodingType.JPEG,
    });

    if (!result) {
      throw new Error("ไม่พบผลลัพธ์จากกล้อง");
    }

    const base64Image = result.thumbnail;

    if (!base64Image) {
      throw new Error("ไม่พบข้อมูลรูปภาพใน result.thumbnail");
    }

    const originalBlob = base64ToBlob(base64Image, "image/jpeg");

    if (originalBlob.size === 0) {
      throw new Error("ไฟล์รูปภาพมีขนาด 0 byte");
    }

    const processedBlob = await preprocessIDCard(
      originalBlob,
      params.rotateDegrees ?? 0,
    );

    imageUrl = URL.createObjectURL(processedBlob);

    emitProgress(params.onProgress, 15, "กำลังโหลดโมเดล OCR...");

    worker = await createWorker(["eng"], 1, {
      logger: (message) => {
        const progress = Math.max(0, Math.min(100, Math.round((message.progress ?? 0) * 100)));
        const mapped = mapTesseractStatus(message.status, progress);

        if (mapped) {
          emitProgress(params.onProgress, mapped.progress, mapped.status);
        }
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    emitProgress(params.onProgress, 70, "กำลังประมวลผลตัวอักษร...");

    const {
      data: { text, confidence },
    } = await worker.recognize(imageUrl);

    const passportData = parsePassportData(text);

    emitProgress(params.onProgress, 100, "สแกนเสร็จแล้ว");

    return {
      passportData,
      confidence,
      rawText: text,
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }
};

export const maskThaiID = (id: string): string => {
  if (id.length !== 13) {
    return id;
  }

  return `${id.slice(0, 1)}-xxxx-xxxxx-${id.slice(10, 12)}-${id.slice(12)}`;
};

const base64ToBlob = (base64: string, mimeType = "image/jpeg"): Blob => {
  const cleanBase64 = base64
    .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
    .replace(/\s/g, "");

  const byteCharacters = atob(cleanBase64);
  const byteArrays: any[] = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);

    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, {
    type: mimeType,
  });
};

async function preprocessIDCard(file: Blob, rotateDegrees = 90): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const radians = (rotateDegrees * Math.PI) / 180;
  const shouldSwapSize = Math.abs(rotateDegrees) % 180 === 90;

  const rotatedWidth = shouldSwapSize ? bitmap.height : bitmap.width;
  const rotatedHeight = shouldSwapSize ? bitmap.width : bitmap.height;

  const scale = rotatedWidth < 1800 ? 1.5 : 1;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rotatedWidth * scale);
  canvas.height = Math.round(rotatedHeight * scale);

  const context = canvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!context) {
    bitmap.close();
    throw new Error("เบราว์เซอร์ไม่รองรับ Canvas");
  }

  context.save();
  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate(radians);
  context.scale(scale, scale);
  context.drawImage(bitmap, -bitmap.width / 2, -bitmap.height / 2);
  context.restore();
  bitmap.close();

  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;

  for (let index = 0; index < pixels.length; index += 4) {
    const red = pixels[index];
    const green = pixels[index + 1];
    const blue = pixels[index + 2];

    let gray = red * 0.299 + green * 0.587 + blue * 0.114;

    const contrast = 1.35;
    gray = (gray - 128) * contrast + 128;
    gray = Math.max(0, Math.min(255, gray));

    pixels[index] = gray;
    pixels[index + 1] = gray;
    pixels[index + 2] = gray;
  }

  context.putImageData(imageData, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("ไม่สามารถสร้างรูปสำหรับ OCR ได้"));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.95,
    );
  });
}

function normalizeOCRText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractFirstName(text: string): string | null {
  const patterns = [
    /(?:^|\n)\s*Name\s+(?:Mr\.?|Mrs\.?|Miss|Ms\.?)?\s*([A-Za-z'-]{2,})/i,
    /(?:^|\n)\s*Name\s*\n\s*(?:Mr\.?|Mrs\.?|Miss|Ms\.?)?\s*([A-Za-z'-]{2,})/i,
    /ชื่อ(?:ตัวและชื่อรอง)?\s+(?:นาย|นาง|นางสาว)?\s*([ก-๙]{2,})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanName(match[1]);
    }
  }

  return null;
}

function extractLastName(text: string): string | null {
  const patterns = [
    /Last\s*name\s+([A-Za-z'-]{2,})/i,
    /Last\s*name\s*\n\s*([A-Za-z'-]{2,})/i,
    /นามสกุล\s+([ก-๙]{2,})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanName(match[1]);
    }
  }

  return null;
}

function extractExpiryDate(text: string): string | null {
  const englishMonth =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|" +
    "May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|" +
    "Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

  const englishPatterns = [
    new RegExp(`Date\\s*of\\s*Expiry[\\s\\n:.-]*(\\d{1,2}\\s+${englishMonth}\\s+\\d{4})`, "i"),
    new RegExp(`Expiry[\\s\\n:.-]*(\\d{1,2}\\s+${englishMonth}\\s+\\d{4})`, "i"),
  ];

  for (const pattern of englishPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return normalizeDateSpacing(match[1]);
    }
  }

  const numericPatterns = [
    /Date\s*of\s*Expiry[\s\n:.-]*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,
    /Expiry[\s\n:.-]*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4})/i,
  ];

  for (const pattern of numericPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1];
    }
  }

  const thaiMonths =
    "(?:ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|" +
    "ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.|" +
    "มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|" +
    "กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)";

  const thaiPatterns = [
    new RegExp(`วันบัตรหมดอายุ[\\s\\n:.-]*(\\d{1,2}\\s+${thaiMonths}\\s+\\d{4})`),
    new RegExp(`วันหมดอายุ[\\s\\n:.-]*(\\d{1,2}\\s+${thaiMonths}\\s+\\d{4})`),
  ];

  for (const pattern of thaiPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return normalizeDateSpacing(match[1]);
    }
  }

  return null;
}

function cleanName(value: string): string {
  return value.replace(/[^A-Za-zก-๙'-]/g, "").trim();
}

function normalizeDateSpacing(date: string): string {
  return date.replace(/\s+/g, " ").trim();
}

function convertEnglishDateToISO(dateValue: string): string | null {
  const months: Record<string, string> = {
    jan: "01",
    january: "01",
    feb: "02",
    february: "02",
    mar: "03",
    march: "03",
    apr: "04",
    april: "04",
    may: "05",
    jun: "06",
    june: "06",
    jul: "07",
    july: "07",
    aug: "08",
    august: "08",
    sep: "09",
    september: "09",
    oct: "10",
    october: "10",
    nov: "11",
    november: "11",
    dec: "12",
    december: "12",
  };

  const normalized = dateValue.replace(/\s+/g, " ").trim();

  const match = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  if (!match) {
    return convertNumericDateToISO(normalized);
  }

  const day = match[1].padStart(2, "0");
  const month = months[match[2].toLowerCase()];
  const year = match[3];

  if (!month) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function convertNumericDateToISO(value: string): string | null {
  const match = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);

  if (!match) {
    return null;
  }

  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3];

  return `${year}-${month}-${day}`;
}

export function parseIDData(text: string): ThaiIDCardData {
  const normalizedText = normalizeOCRText(text);

  const idNumber = extractThaiIDNumber(normalizedText);
  const firstName = extractFirstName(normalizedText);
  const lastName = extractLastName(normalizedText);
  const expiryDate = extractExpiryDate(normalizedText);

  return {
    idNumber,
    firstName,
    lastName,
    expiryDate,
    expiryDateISO: expiryDate ? convertEnglishDateToISO(expiryDate) : null,
    rawText: text,
  };
}

function normalizeMRZLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[^A-Z0-9<]/g, "")
    .replace(/[«]/g, "<");
}

function parseMRZDateYYMMDD(value: string, mode: "birth" | "expiry"): string | null {
  if (!/^\d{6}$/.test(value)) {
    return null;
  }

  const yy = Number(value.slice(0, 2));
  const month = Number(value.slice(2, 4));
  const day = Number(value.slice(4, 6));
  const now = new Date();
  const currentYY = now.getUTCFullYear() % 100;

  let year = 2000 + yy;

  if (mode === "birth" && yy > currentYY) {
    year = 1900 + yy;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  const parsed = new Date(`${isoDate}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return isoDate;
}

function cleanMRZName(value: string): string | null {
  const cleaned = value
    .replace(/<+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length > 0 ? cleaned : null;
}

function extractPassportNumber(text: string): string | null {
  const labeledPatterns = [
    /Passport\s*(?:No\.?|Number)\s*[:：]?\s*([A-Z0-9]{6,12})/i,
    /เลขหนังสือเดินทาง\s*[:：]?\s*([A-Z0-9]{6,12})/i,
  ];

  for (const pattern of labeledPatterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return match[1].toUpperCase();
    }
  }

  const generic = text.match(/\b[A-Z]{1,2}\d{6,8}\b/g) ?? [];

  if (generic.length > 0) {
    return generic[0].toUpperCase();
  }

  return null;
}

function extractPassportNamesFromText(
  text: string,
): { firstName: string | null; lastName: string | null } {
  const surnameMatch = text.match(/Surname\s*\/\s*Nom\s*[:：]?\s*([A-Z' -]{2,})/i);
  const givenNameMatch = text.match(/Given\s*names?\s*\/\s*Pr[eé]noms\s*[:：]?\s*([A-Z' -]{2,})/i);

  return {
    firstName: givenNameMatch?.[1] ? normalizeDateSpacing(givenNameMatch[1]).toUpperCase() : null,
    lastName: surnameMatch?.[1] ? normalizeDateSpacing(surnameMatch[1]).toUpperCase() : null,
  };
}

function extractPassportMRZ(
  text: string,
): { mrzLine1: string | null; mrzLine2: string | null } {
  const lines = text
    .split("\n")
    .map((line) => normalizeMRZLine(line))
    .filter((line) => line.length >= 20);

  const line1Index = lines.findIndex((line) => line.startsWith("P<"));

  if (line1Index === -1) {
    return {
      mrzLine1: null,
      mrzLine2: null,
    };
  }

  const mrzLine1 = lines[line1Index];
  const mrzLine2 =
    lines
      .slice(line1Index + 1)
      .find((line) => /\d/.test(line) && line.length >= 30) ?? null;

  return {
    mrzLine1,
    mrzLine2,
  };
}

function parsePassportFromMRZ(
  mrzLine1: string,
  mrzLine2: string,
): Partial<PassportOCRData> {
  const l1 = mrzLine1.padEnd(44, "<").slice(0, 44);
  const l2 = mrzLine2.padEnd(44, "<").slice(0, 44);

  const issuingCountry = l1.slice(2, 5).replace(/</g, "") || null;
  const nameBlock = l1.slice(5);
  const [surnameRaw, givenRaw = ""] = nameBlock.split("<<", 2);

  const passportNumber = l2
    .slice(0, 9)
    .replace(/</g, "")
    .replace(/O/g, "0")
    .trim();
  const nationality = l2.slice(10, 13).replace(/</g, "") || null;
  const dateOfBirthRaw = l2.slice(13, 19).replace(/O/g, "0");
  const sexRaw = l2.slice(20, 21).replace(/</g, "");
  const expiryRaw = l2.slice(21, 27).replace(/O/g, "0");

  return {
    passportNumber: passportNumber || null,
    firstName: cleanMRZName(givenRaw),
    lastName: cleanMRZName(surnameRaw),
    nationality,
    dateOfBirth: parseMRZDateYYMMDD(dateOfBirthRaw, "birth"),
    dateOfBirthISO: parseMRZDateYYMMDD(dateOfBirthRaw, "birth"),
    expiryDate: parseMRZDateYYMMDD(expiryRaw, "expiry"),
    expiryDateISO: parseMRZDateYYMMDD(expiryRaw, "expiry"),
    sex: sexRaw || null,
    issuingCountry,
    mrzLine1,
    mrzLine2,
  };
}

export function parsePassportData(text: string): PassportOCRData {
  const normalizedText = normalizeOCRText(text);
  const { mrzLine1, mrzLine2 } = extractPassportMRZ(normalizedText);
  const mrzData = mrzLine1 && mrzLine2 ? parsePassportFromMRZ(mrzLine1, mrzLine2) : {};
  const fallbackNames = extractPassportNamesFromText(normalizedText);

  const fallbackDateOfBirth = extractDateOfBirth(normalizedText);
  const fallbackDateOfBirthISO = fallbackDateOfBirth
    ? convertEnglishDateToISO(fallbackDateOfBirth) ?? normalizeOCRDateToISO(fallbackDateOfBirth)
    : null;

  const fallbackExpiryDate = extractExpiryDate(normalizedText);
  const fallbackExpiryISO = fallbackExpiryDate
    ? convertEnglishDateToISO(fallbackExpiryDate) ?? normalizeOCRDateToISO(fallbackExpiryDate)
    : null;

  const nationalityMatch = normalizedText.match(/Nationality\s*[:：]?\s*([A-Z]{3})/i);
  const sexMatch = normalizedText.match(/Sex\s*[:：]?\s*([MFX])/i);

  return {
    passportNumber: mrzData.passportNumber ?? extractPassportNumber(normalizedText),
    firstName: mrzData.firstName ?? fallbackNames.firstName,
    lastName: mrzData.lastName ?? fallbackNames.lastName,
    nationality: mrzData.nationality ?? (nationalityMatch?.[1]?.toUpperCase() ?? null),
    dateOfBirth: mrzData.dateOfBirth ?? fallbackDateOfBirth,
    dateOfBirthISO: mrzData.dateOfBirthISO ?? fallbackDateOfBirthISO,
    expiryDate: mrzData.expiryDate ?? fallbackExpiryDate,
    expiryDateISO: mrzData.expiryDateISO ?? fallbackExpiryISO,
    sex: mrzData.sex ?? (sexMatch?.[1]?.toUpperCase() ?? null),
    issuingCountry: mrzData.issuingCountry ?? null,
    mrzLine1,
    mrzLine2,
    rawText: text,
  };
}

export function extractDateOfExpiry(text: string): string | null {
  const normalized = text.replace(/\r/g, "\n");

  const labeledRegex =
    /(?:Date\s*of\s*Expiry|Expiry\s*Date|วันหมดอายุ|หมดอายุ)\s*[:：]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i;
  const labeledMatch = normalized.match(labeledRegex);

  if (labeledMatch?.[1]) {
    return normalizeOCRDateToISO(labeledMatch[1]);
  }

  const allNumericDates = normalized.match(/\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g) ?? [];

  if (allNumericDates.length === 0) {
    return null;
  }

  const parsedDates = allNumericDates
    .map((dateText) => normalizeOCRDateToISO(dateText))
    .filter((value): value is string => Boolean(value));

  if (parsedDates.length === 0) {
    return null;
  }

  parsedDates.sort();
  return parsedDates[parsedDates.length - 1];
}

export function normalizeOCRDateToISO(value: string): string | null {
  const dateMatch = value.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);

  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  let year = Number(dateMatch[3]);

  if (year < 100) {
    year += 2000;
  }

  if (year > 2400) {
    year -= 543;
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const isoDate = `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

  const parsed = new Date(`${isoDate}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return isoDate;
}

export function extractNameFromIDCard(
  text: string,
): { firstName: string; lastName: string } | null {
  const normalized = text.replace(/\s+/g, " ").trim();

  const thaiLabeledNameRegex =
    /(?:ช(?:ื|ี)?่?อ|name)\s*[:：]?\s*([ก-๙A-Za-z]+)\s+(?:สกุล|surname|last\s*name)\s*[:：]?\s*([ก-๙A-Za-z]+)/i;
  const thaiLabeledMatch = normalized.match(thaiLabeledNameRegex);

  if (thaiLabeledMatch) {
    return {
      firstName: thaiLabeledMatch[1],
      lastName: thaiLabeledMatch[2],
    };
  }

  const lineSeparatedRegex =
    /(?:ช(?:ื|ี)?่?อ|name)\s*[:：]?\s*([ก-๙A-Za-z]+)(?:\s|\n)+(?:สกุล|surname|last\s*name)\s*[:：]?\s*([ก-๙A-Za-z]+)/i;
  const lineSeparatedMatch = text.match(lineSeparatedRegex);

  if (lineSeparatedMatch) {
    return {
      firstName: lineSeparatedMatch[1],
      lastName: lineSeparatedMatch[2],
    };
  }

  return null;
}

export function extractThaiIDNumber(text: string): string | null {
  const formattedPattern = /\b\d[\s-]*\d{4}[\s-]*\d{5}[\s-]*\d{2}[\s-]*\d\b/g;
  const matches = text.match(formattedPattern) ?? [];

  for (const match of matches) {
    const digits = match.replace(/\D/g, "");

    if (digits.length === 13 && validateThaiIDChecksum(digits)) {
      return digits;
    }
  }

  const numericCandidates = text.match(/(?:\d[\s\-.:]*){13}/g) ?? [];

  for (const candidate of numericCandidates) {
    const digits = candidate.replace(/\D/g, "");

    if (digits.length === 13 && validateThaiIDChecksum(digits)) {
      return digits;
    }
  }

  return null;
}

export function validateThaiIDChecksum(id: string): boolean {
  if (!/^\d{13}$/.test(id)) {
    return false;
  }

  const digits = id.split("").map(Number);
  let sum = 0;

  for (let index = 0; index < 12; index += 1) {
    sum += digits[index] * (13 - index);
  }

  const checkDigit = (11 - (sum % 11)) % 10;

  return checkDigit === digits[12];
}

export function extractDateOfBirth(text: string): string | null {
  const monthPattern =
    "(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|" +
    "May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|" +
    "Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)";

  const englishDateRegex = new RegExp(`\\b(\\d{1,2})\\s+(${monthPattern})\\s+(\\d{4})\\b`, "i");
  const englishMatch = text.match(englishDateRegex);

  if (englishMatch) {
    return `${englishMatch[1]} ${englishMatch[2]} ${englishMatch[3]}`;
  }

  const numericDateRegex = /\b(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})\b/;
  const numericMatch = text.match(numericDateRegex);

  if (numericMatch) {
    return numericMatch[0];
  }

  const thaiMonths =
    "(?:ม\\.ค\\.|ก\\.พ\\.|มี\\.ค\\.|เม\\.ย\\.|พ\\.ค\\.|มิ\\.ย\\.|" +
    "ก\\.ค\\.|ส\\.ค\\.|ก\\.ย\\.|ต\\.ค\\.|พ\\.ย\\.|ธ\\.ค\\.|" +
    "มกราคม|กุมภาพันธ์|มีนาคม|เมษายน|พฤษภาคม|มิถุนายน|" +
    "กรกฎาคม|สิงหาคม|กันยายน|ตุลาคม|พฤศจิกายน|ธันวาคม)";

  const thaiDateRegex = new RegExp(`\\b(\\d{1,2})\\s+(${thaiMonths})\\s+(\\d{4})\\b`);
  const thaiMatch = text.match(thaiDateRegex);

  if (thaiMatch) {
    return thaiMatch[0];
  }

  return null;
}


export const handleCardCaptured = async (blob: Blob) => {
  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  let imageUrl: string | null = null;
  let result = null
  try {
    // Camera Preview ถ่ายแนวเดียวกับกรอบแล้ว
    // จึงเริ่มด้วย rotate = 0
    const processedBlob = await preprocessIDCard(blob, 0);

    imageUrl = URL.createObjectURL(processedBlob);

    worker = await createWorker(["tha", "eng"], 1, {
      logger: (message) => {
        if (message.status === "recognizing text") {
          console.log(
            `OCR ${Math.round((message.progress ?? 0) * 100)}%`,
          );
        }
      },
    });

    const workerresult = await worker.recognize(imageUrl);
    const cardData = parseIDData(workerresult.data.text);
    result = {
      ...cardData
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  }

  return await result;
};