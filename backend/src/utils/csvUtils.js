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

  if (!rows.length) {
    return [];
  }

  const headers = rows[0].map((header) => normalizeCsvHeader(header));
  return rows.slice(1).map((values, rowIndex) => {
    const record = { __rowNumber: rowIndex + 2 };
    headers.forEach((header, columnIndex) => {
      if (!header) {
        return;
      }
      record[header] = String(values[columnIndex] || "").trim();
    });
    return record;
  });
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
    .trim()
    .replace(/^\*/, "")
    .replace(/\(required\)/gi, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^./, (character) => character.toLowerCase());
}

module.exports = {
  parseCsv,
  toCsv,
  normalizeCsvHeader,
};
