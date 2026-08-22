import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function normalizeCell(value) {
  if (value === null || value === undefined) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeCell(item)).filter(Boolean).join(", ");
  }

  if (typeof value === "object") {
    return value.label || value.name || value.title || value.memberName || value.value || "";
  }

  return String(value);
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function exportRowsToCsv({ fileName, columns, rows }) {
  const headerRow = columns.map((column) => `"${String(column.header).replace(/"/g, '""')}"`).join(",");
  const dataRows = rows.map((row) =>
    columns
      .map((column) => `"${normalizeCell(row[column.key]).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headerRow, ...dataRows].join("\r\n");
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName);
}

export function exportRowsToPdf({ fileName, title, columns, rows }) {
  const documentInstance = new jsPDF({
    orientation: columns.length > 7 ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const generatedAt = new Date().toLocaleString();

  documentInstance.setFontSize(14);
  documentInstance.text(title, 40, 40);
  documentInstance.setFontSize(9);
  documentInstance.text(`Generated: ${generatedAt}`, 40, 58);

  autoTable(documentInstance, {
    startY: 72,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => normalizeCell(row[column.key]))),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
    },
    margin: { left: 28, right: 28, top: 72, bottom: 28 },
  });

  documentInstance.save(fileName);
}
