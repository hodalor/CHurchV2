import jsPDF from "jspdf";
import { formatDateDisplay } from "./dateUtils";

const MARGIN = 36;
const PAGE_BOTTOM = 800;
const HEADER_HEIGHT = 100;
const GREY = [229, 231, 235];
const BORDER = [0, 0, 0];
const REQUIRED_COLOR = [185, 28, 28];
const MUTED = [75, 85, 99];

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

function drawLetterhead(doc, branding, logoDataUrl) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const headerTop = 28;
  const textStartX = logoDataUrl ? 90 : MARGIN;

  if (logoDataUrl) {
    try {
      const imageType =
        logoDataUrl.includes("image/jpeg") || logoDataUrl.includes("image/jpg") ? "JPEG" : "PNG";
      doc.addImage(logoDataUrl, imageType, MARGIN, headerTop, 42, 42);
    } catch (error) {
      // Skip logo if unsupported.
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(0, 0, 0);
  doc.text(branding.churchName || branding.appName || "Church Membership Form", textStartX, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...MUTED);

  const lines = [
    branding.address,
    [branding.phone, branding.email].filter(Boolean).join("  |  "),
    branding.website,
  ].filter(Boolean);

  lines.forEach((line, index) => {
    doc.text(line, textStartX, 58 + index * 11);
  });

  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(1.2);
  doc.line(MARGIN, 88, pageWidth - MARGIN, 88);

  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.4);
  doc.setTextColor(0, 0, 0);
}

function ensureSpace(doc, y, needed, branding, logoDataUrl, pageState) {
  if (y + needed <= PAGE_BOTTOM) {
    return y;
  }

  doc.addPage();
  pageState.pageNumber += 1;
  drawLetterhead(doc, branding, logoDataUrl);
  drawPageFooter(doc, pageState.pageNumber);
  return HEADER_HEIGHT;
}

function drawPageFooter(doc, pageNumber) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Page ${pageNumber}`, pageWidth - MARGIN, 820, { align: "right" });
  doc.setTextColor(0, 0, 0);
}

function drawInstructionBanner(doc, y) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("THIS FORM MUST BE COMPLETED FOR EACH MEMBER / APPLICANT", MARGIN, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const instruction =
    "One signed original to be submitted to the church office for data entry. Fields marked (required) cannot be left blank. Please write clearly in block letters.";
  const wrapped = doc.splitTextToSize(instruction, contentWidth);
  doc.text(wrapped, MARGIN, y + 14);
  doc.setTextColor(0, 0, 0);

  return y + 14 + wrapped.length * 10 + 8;
}

function drawSectionHeader(doc, title, y, branding, logoDataUrl, pageState) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const nextY = ensureSpace(doc, y, 22, branding, logoDataUrl, pageState);

  doc.setFillColor(...GREY);
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN, nextY, contentWidth, 18, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), MARGIN + 6, nextY + 12);

  return nextY + 18;
}

function drawLabel(doc, text, x, y, { required = false, maxWidth = 120 } = {}) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(text, x, y, { maxWidth });

  if (required) {
    const labelWidth = doc.getTextWidth(text);
    doc.setTextColor(...REQUIRED_COLOR);
    doc.setFont("helvetica", "bold");
    doc.text(" (required)", x + labelWidth, y);
    doc.setTextColor(0, 0, 0);
  }
}

function drawCell(doc, x, y, width, height) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255);
  doc.rect(x, y, width, height, "S");
}

function drawCheckbox(doc, x, y, label) {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.6);
  doc.rect(x, y - 6, 8, 8, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.text(label, x + 12, y);
}

function drawLabeledBox(doc, { label, x, y, width, height, required = false, hint = "" }) {
  drawLabel(doc, label, x + 3, y + 10, { required, maxWidth: width - 8 });
  if (hint) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...MUTED);
    doc.text(hint, x + 3, y + 20, { maxWidth: width - 8 });
    doc.setTextColor(0, 0, 0);
  }
  drawCell(doc, x, y, width, height);
  return y + height;
}

function drawFieldRow(doc, fields, y, branding, logoDataUrl, pageState) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const height = Math.max(...fields.map((field) => field.height || 34));
  const nextY = ensureSpace(doc, y, height, branding, logoDataUrl, pageState);
  const totalWeight = fields.reduce((sum, field) => sum + (field.weight || 1), 0);
  let x = MARGIN;

  fields.forEach((field) => {
    const width = contentWidth * ((field.weight || 1) / totalWeight);
    drawLabeledBox(doc, {
      label: field.label,
      x,
      y: nextY,
      width,
      height,
      required: field.required,
      hint: field.hint,
    });
    x += width;
  });

  return nextY + height;
}

function drawCheckboxRow(doc, { label, options, y, required = false, branding, logoDataUrl, pageState }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const labelColumnWidth = 132;
  const optionStartX = MARGIN + labelColumnWidth;
  const optionMaxX = MARGIN + contentWidth - 8;
  const lineHeight = 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  let optionX = optionStartX;
  let optionLine = 0;
  const positions = options.map((option) => {
    const optionWidth = Math.max(54, doc.getTextWidth(option) + 28);
    if (optionX + optionWidth > optionMaxX && optionX > optionStartX) {
      optionLine += 1;
      optionX = optionStartX;
    }
    const position = { option, x: optionX, line: optionLine };
    optionX += optionWidth;
    return position;
  });

  const height = Math.max(28, 14 + (optionLine + 1) * lineHeight);
  const nextY = ensureSpace(doc, y, height, branding, logoDataUrl, pageState);

  drawCell(doc, MARGIN, nextY, contentWidth, height);
  drawLabel(doc, label, MARGIN + 4, nextY + 12, { required });

  positions.forEach(({ option, x, line }) => {
    drawCheckbox(doc, x, nextY + 14 + line * lineHeight, option);
  });

  return nextY + height;
}

function drawTextAreaRow(doc, { label, y, height = 56, required = false, branding, logoDataUrl, pageState }) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const nextY = ensureSpace(doc, y, height, branding, logoDataUrl, pageState);
  drawLabeledBox(doc, {
    label,
    x: MARGIN,
    y: nextY,
    width: contentWidth,
    height,
    required,
  });
  return nextY + height;
}

function drawFamilyTable(doc, y, branding, logoDataUrl, pageState) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const rowHeight = 22;
  const rows = 5;
  const colWidths = [contentWidth * 0.45, contentWidth * 0.3, contentWidth * 0.25];
  const headers = ["Full name of family member", "Relationship", "Member ID (if known)"];
  const blockHeight = 16 + rowHeight * (rows + 1);
  let nextY = ensureSpace(doc, y, blockHeight, branding, logoDataUrl, pageState);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...MUTED);
  doc.text("List household / family links (Spouse, Son, Daughter, Parent, Sibling, Dependent, Other).", MARGIN, nextY + 8);
  doc.setTextColor(0, 0, 0);
  nextY += 12;

  let x = MARGIN;
  headers.forEach((header, index) => {
    doc.setFillColor(...GREY);
    doc.setDrawColor(...BORDER);
    doc.rect(x, nextY, colWidths[index], rowHeight, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(header, x + 4, nextY + 14);
    x += colWidths[index];
  });
  nextY += rowHeight;

  for (let row = 0; row < rows; row += 1) {
    x = MARGIN;
    colWidths.forEach((width) => {
      drawCell(doc, x, nextY, width, rowHeight);
      x += width;
    });
    nextY += rowHeight;
  }

  return nextY;
}

function drawPhotoBoxes(doc, y, branding, logoDataUrl, pageState) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const boxHeight = 88;
  const gap = 8;
  const boxWidth = (contentWidth - gap * 2) / 3;
  const nextY = ensureSpace(doc, y, boxHeight, branding, logoDataUrl, pageState);
  const labels = ["Personal photo", "ID front (Adult)", "ID back (Adult)"];

  labels.forEach((label, index) => {
    const x = MARGIN + index * (boxWidth + gap);
    drawCell(doc, x, nextY, boxWidth, boxHeight);
    drawLabel(doc, label, x + 4, nextY + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text("Attach / paste here", x + 4, nextY + 26);
    doc.setTextColor(0, 0, 0);
  });

  return nextY + boxHeight;
}

function drawSignatureBlock(doc, y, branding, logoDataUrl, pageState) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;
  const height = 70;
  const nextY = ensureSpace(doc, y, height + 8, branding, logoDataUrl, pageState);

  drawCell(doc, MARGIN, nextY, contentWidth * 0.62, height);
  drawLabel(doc, "Applicant / member signature", MARGIN + 4, nextY + 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text("I confirm the information provided on this form is true and complete.", MARGIN + 4, nextY + 24);
  doc.setTextColor(0, 0, 0);

  const dateX = MARGIN + contentWidth * 0.62;
  drawCell(doc, dateX, nextY, contentWidth * 0.38, height);
  drawLabel(doc, "Date", dateX + 4, nextY + 12);

  return nextY + height;
}

/**
 * Download a blank, printable membership application form matching church member fields.
 * Required markers follow getRequiredMemberError validation.
 */
export async function exportMembershipApplicationPdf({ branding = {}, fileName } = {}) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });
  const logoDataUrl = await loadImageAsDataUrl(branding?.appLogoUrl);
  const pageState = { pageNumber: 1 };
  const churchLabel = branding.churchName || branding.appName || "Church";

  drawLetterhead(doc, branding, logoDataUrl);
  drawPageFooter(doc, pageState.pageNumber);

  let y = HEADER_HEIGHT;
  y = drawInstructionBanner(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${churchLabel} — Membership Application Form`, MARGIN, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  doc.text(`Blank form for data collection  ·  Printed ${formatDateDisplay(new Date())}`, MARGIN, y + 12);
  doc.setTextColor(0, 0, 0);
  y += 24;

  y = drawSectionHeader(doc, "Personal details", y, branding, logoDataUrl, pageState);
  y = drawCheckboxRow(doc, {
    label: "Member type",
    options: ["Adult", "Child"],
    y,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "First name", required: true, weight: 1.1 },
      { label: "Other name", weight: 1 },
      { label: "Preferred name", weight: 1 },
      { label: "Surname", required: true, weight: 1.1 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawCheckboxRow(doc, {
    label: "Gender",
    options: ["Male", "Female"],
    y,
    required: true,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawCheckboxRow(doc, {
    label: "Marital status",
    options: ["Single", "Married", "Widowed", "Divorced", "Separated", "Other"],
    y,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "Date of birth", hint: "DD / MM / YYYY", weight: 1 },
      { label: "Primary mobile", required: true, weight: 1.2 },
      { label: "Email", weight: 1.3 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawFieldRow(
    doc,
    [{ label: "Residential area", required: true, weight: 1 }],
    y,
    branding,
    logoDataUrl,
    pageState
  );

  y = drawSectionHeader(doc, "Contact & location", y + 6, branding, logoDataUrl, pageState);
  y = drawTextAreaRow(doc, {
    label: "Physical address",
    y,
    height: 48,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "City", weight: 1 },
      { label: "Country", weight: 1 },
      { label: "GPS latitude (optional)", weight: 1 },
      { label: "GPS longitude (optional)", weight: 1 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawTextAreaRow(doc, {
    label: "Notes / additional information",
    y,
    height: 44,
    branding,
    logoDataUrl,
    pageState,
  });

  y = drawSectionHeader(doc, "Church information", y + 6, branding, logoDataUrl, pageState);
  y = drawCheckboxRow(doc, {
    label: "Membership status",
    options: ["Active", "Inactive", "New Convert", "Transferred In", "Transferred Out", "Other"],
    y,
    required: true,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "Date joined", hint: "DD / MM / YYYY", weight: 1 },
      { label: "Previous congregation", weight: 1.4 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawCheckboxRow(doc, {
    label: "Baptism status",
    options: ["Baptized", "Not Baptized"],
    y,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "Baptism date", hint: "DD / MM / YYYY", weight: 1 },
      { label: "Place baptized", weight: 1.2 },
      { label: "Baptized by", weight: 1.2 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawTextAreaRow(doc, {
    label: "Transfer details (if applicable)",
    y,
    height: 40,
    branding,
    logoDataUrl,
    pageState,
  });
  y = drawFieldRow(
    doc,
    [
      { label: "Occupation", weight: 1 },
      { label: "Employer or business", weight: 1.2 },
      { label: "Education or skills", weight: 1.2 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawFieldRow(
    doc,
    [
      { label: "Ministry (if known)", weight: 1 },
      { label: "Groups / departments (list all)", weight: 1.6 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );

  y = drawSectionHeader(doc, "Family / household", y + 6, branding, logoDataUrl, pageState);
  y = drawFieldRow(
    doc,
    [
      { label: "Household / family name", weight: 1.4 },
      { label: "Household role", hint: "Head, Spouse, Son, Daughter, Dependent, Other", weight: 1.2 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );
  y = drawFamilyTable(doc, y + 4, branding, logoDataUrl, pageState);

  y = drawSectionHeader(doc, "Photos & identification", y + 8, branding, logoDataUrl, pageState);
  y = drawPhotoBoxes(doc, y, branding, logoDataUrl, pageState);

  y = drawSectionHeader(doc, "Declaration & signature", y + 8, branding, logoDataUrl, pageState);
  y = drawSignatureBlock(doc, y, branding, logoDataUrl, pageState);

  y = drawSectionHeader(doc, "Office use only", y + 8, branding, logoDataUrl, pageState);
  y = drawFieldRow(
    doc,
    [
      { label: "Assigned member ID", weight: 1 },
      { label: "Data entry clerk", weight: 1.2 },
      { label: "Date captured", weight: 1 },
      { label: "Source record ref", weight: 1 },
    ],
    y,
    branding,
    logoDataUrl,
    pageState
  );

  const safeName =
    fileName ||
    `${String(churchLabel)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-membership-application-form.pdf`;

  doc.save(safeName);
}
