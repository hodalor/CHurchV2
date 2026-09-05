const path = require("path");
const XLSX = require("xlsx");

function parseCsv(text = "") {
  const rows = [];
  let current = "";
  let row = [];
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const nextCharacter = text[index + 1];

    if (character === "\"") {
      if (insideQuotes && nextCharacter === "\"") {
        current += "\"";
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(current);
      if (row.some((value) => String(value || "").trim() !== "")) {
        rows.push(row);
      }
      row = [];
      current = "";
      continue;
    }

    current += character;
  }

  row.push(current);
  if (row.some((value) => String(value || "").trim() !== "")) {
    rows.push(row);
  }

  return rowsToRecords(rows);
}

function toCsv(rows = []) {
  return rows
    .map((row) =>
      row
        .map((value) => escapeCsvValue(value))
        .join(",")
    )
    .join("\n");
}

function escapeCsvValue(value) {
  const text = String(value ?? "");
  if (!/[",\n\r]/.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function normalizeCsvHeader(value = "") {
  return String(value)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^\*/, "")
    .replace(/\(required\)/gi, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^./, (character) => character.toLowerCase());
}

function parseSpreadsheet(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    raw: true,
    cellDates: true,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: "",
    blankrows: false,
  });

  return rowsToRecords(rows);
}

function rowsToRecords(rows = []) {
  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows
    .slice(1)
    .filter((values) => Array.isArray(values) && values.some((value) => String(value || "").trim() !== ""))
    .map((values, rowIndex) => {
      const record = { __rowNumber: rowIndex + 2 };
      headers.forEach((header, columnIndex) => {
        if (!header) {
          return;
        }
        record[header] = normalizeImportCellValue(values[columnIndex]);
      });
      return record;
    });
}

function parseImportFile(buffer, { originalName = "", mimeType = "" } = {}) {
  const extension = String(path.extname(originalName || "")).trim().toLowerCase();
  const normalizedMimeType = String(mimeType || "").toLowerCase();

  if (extension === ".xlsx" || extension === ".xls" || normalizedMimeType.includes("spreadsheetml") || normalizedMimeType.includes("ms-excel")) {
    return parseSpreadsheet(buffer);
  }

  if (!extension || extension === ".csv" || extension === ".txt" || normalizedMimeType.includes("csv") || normalizedMimeType.startsWith("text/")) {
    return parseCsv(buffer.toString("utf8"));
  }

  throw new Error("Use a CSV, XLSX, or XLS file for import.");
}

function normalizeImportCellValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, "0"),
      String(value.getDate()).padStart(2, "0"),
    ].join("-");
  }

  return String(value || "").trim();
}

module.exports = {
  parseImportFile,
  parseCsv,
  toCsv,
  normalizeCsvHeader,
};
