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

async function loadImageAsDataUrl(imageUrl) {
  if (!imageUrl) {
    return "";
  }

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    return "";
  }
}

function buildBrandingLines(branding = {}) {
  return [
    branding.address,
    [branding.phone, branding.email].filter(Boolean).join(" | "),
    branding.website,
  ].filter(Boolean);
}

function buildSummaryLine(summaryItems = []) {
  return summaryItems
    .map((item) => `${item.label}: ${normalizeCell(item.value)}`)
    .join(" || ");
}

function getSummaryFontSize(summaryLine = "") {
  if (summaryLine.length > 260) {
    return 6;
  }
  if (summaryLine.length > 200) {
    return 7;
  }
  return 8;
}

function drawPdfLetterhead(doc, { branding = {}, title = "", generatedAt = "", logoDataUrl = "", pageNumber = 1 }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerTop = 28;
  const textStartX = logoDataUrl ? 94 : 40;

  if (logoDataUrl) {
    try {
      const imageType = logoDataUrl.includes("image/jpeg") || logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, imageType, 40, headerTop, 40, 40);
    } catch (error) {
      // Skip logo if the image format is unsupported.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(branding.churchName || branding.appName || "Church Report", textStartX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const brandingLines = buildBrandingLines(branding);
  brandingLines.forEach((line, index) => {
    doc.text(line, textStartX, 58 + index * 12);
  });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1);
  doc.line(40, 94, pageWidth - 40, 94);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(title, 40, 118);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Generated: ${generatedAt}`, 40, 132);
  doc.text(`Page ${pageNumber}`, pageWidth - 70, 132);
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

export async function exportRowsToPdf({
  fileName,
  title,
  columns,
  rows,
  branding,
  summaryItems = [],
}) {
  const doc = new jsPDF({
    orientation: columns.length > 7 ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
  });
  const generatedAt = new Date().toLocaleString();
  const logoDataUrl = await loadImageAsDataUrl(branding?.appLogoUrl);
  const pageWidth = doc.internal.pageSize.getWidth();
  let summaryY = 154;

  if (summaryItems.length) {
    const summaryLine = buildSummaryLine(summaryItems);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(40, summaryY, pageWidth - 80, 28, 8, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(getSummaryFontSize(summaryLine));
    doc.text(summaryLine, 54, summaryY + 18);
    summaryY += 44;
  }

  autoTable(doc, {
    startY: summaryY,
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => normalizeCell(row[column.key]))),
    styles: {
      fontSize: 8,
      cellPadding: 4,
      overflow: "linebreak",
      valign: "top",
      lineColor: [203, 213, 225],
      lineWidth: 0.4,
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 28, right: 28, top: 146, bottom: 34 },
    didDrawPage(data) {
      drawPdfLetterhead(doc, {
        branding,
        title,
        generatedAt,
        logoDataUrl,
        pageNumber: data.pageNumber,
      });
    },
  });

  doc.save(fileName);
}
