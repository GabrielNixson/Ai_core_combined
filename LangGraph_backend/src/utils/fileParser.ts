import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import * as xlsx from "xlsx";
import AdmZip from "adm-zip";
import officeParser from "officeparser";

export async function parsePdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const textResult = await parser.getText();
    return textResult.text || "";
  } finally {
    try {
      await parser.destroy();
    } catch (e) {
      // ignore cleanup errors
    }
  }
}

export async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value || "";
}

export async function parseExcel(buffer: Buffer): Promise<string> {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  let fullText = "";
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (rows.length === 0) continue;

    let markdownTable = `### Sheet: ${sheetName}\n\n`;
    
    // Find the max columns in any row
    let maxCols = 0;
    for (const row of rows) {
      if (row.length > maxCols) maxCols = row.length;
    }

    if (maxCols === 0) continue;

    // Headers row
    const headers = rows[0];
    markdownTable += "| " + Array.from({ length: maxCols }, (_, i) => String(headers[i] ?? "").trim()).join(" | ") + " |\n";
    
    // Dividers row
    markdownTable += "| " + Array.from({ length: maxCols }, () => "---").join(" | ") + " |\n";

    // Data rows
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const rowText = "| " + Array.from({ length: maxCols }, (_, i) => String(row[i] ?? "").trim()).join(" | ") + " |\n";
      markdownTable += rowText;
    }

    fullText += markdownTable + "\n";
  }
  return fullText;
}

export async function parsePptx(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    officeParser.parseOffice(buffer, (data: any, err: any) => {
      if (err) return reject(err);
      resolve(data || "");
    });
  });
}

export function parseText(buffer: Buffer): string {
  return buffer.toString("utf-8");
}

export async function parseFile(filename: string, buffer: Buffer): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase();
  
  switch (ext) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "xlsx":
    case "xls":
    case "csv":
      return parseExcel(buffer);
    case "pptx":
      return parsePptx(buffer);
    case "json":
    case "xml":
    case "html":
    case "htm":
    case "md":
    case "txt":
      return parseText(buffer);
    default:
      // Fallback
      return parseText(buffer);
  }
}

export async function parseZip(buffer: Buffer): Promise<Array<{ filename: string; text: string }>> {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const parsedFiles: Array<{ filename: string; text: string }> = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;
    const filename = entry.entryName;
    const entryBuffer = entry.getData();
    
    try {
      const text = await parseFile(filename, entryBuffer);
      if (text.trim()) {
        parsedFiles.push({ filename, text });
      }
    } catch (e: any) {
      console.error(`Error parsing zipped file '${filename}':`, e.message);
    }
  }
  return parsedFiles;
}
