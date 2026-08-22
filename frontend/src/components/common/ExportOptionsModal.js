import { useEffect, useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import { exportRowsToCsv, exportRowsToPdf } from "../../utils/exportUtils";
import { useAppContext } from "../../context/AppContext";

export default function ExportOptionsModal({
  open,
  onClose,
  title,
  fileBaseName,
  columns,
  rows,
  summaryItems = [],
}) {
  const { branding, notifyError, notifySuccess } = useAppContext();
  const [format, setFormat] = useState("pdf");
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormat("pdf");
      setSelectedKeys(columns.map((column) => column.key));
    }
  }, [columns, open]);

  const selectedColumns = useMemo(
    () => columns.filter((column) => selectedKeys.includes(column.key)),
    [columns, selectedKeys]
  );
  const exportSummaryItems = useMemo(
    () => [
      ...summaryItems,
      { label: "Rows To Export", value: rows.length },
      { label: "Selected Fields", value: selectedColumns.length },
    ],
    [rows.length, selectedColumns.length, summaryItems]
  );
  const summaryLine = useMemo(
    () =>
      exportSummaryItems
        .map((item) => `${item.label}: ${String(item.value ?? "-")}`)
        .join(" || "),
    [exportSummaryItems]
  );

  if (!open) {
    return null;
  }

  const toggleField = (key) => {
    setSelectedKeys((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleExport = async () => {
    if (!selectedColumns.length) {
      notifyError("Select at least one field to export.");
      return;
    }

    try {
      setExporting(true);
      if (format === "csv") {
        exportRowsToCsv({
          fileName: `${fileBaseName}.csv`,
          columns: selectedColumns,
          rows,
        });
      } else {
        await exportRowsToPdf({
          fileName: `${fileBaseName}.pdf`,
          title,
          columns: selectedColumns,
          rows,
          branding,
          summaryItems: exportSummaryItems,
        });
      }
      notifySuccess(`${format.toUpperCase()} export generated successfully.`);
      onClose();
    } catch (error) {
      notifyError(error.message || "Unable to generate export.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <ModalShell title={title} subtitle="Choose the export format and the exact fields to include." onClose={onClose}>
      <div className="modal-form">
        <div className="form-grid">
          <label>
            Format
            <select value={format} onChange={(event) => setFormat(event.target.value)}>
              <option value="pdf">PDF</option>
              <option value="csv">CSV</option>
            </select>
          </label>
        </div>

        <section className="surface-card export-selection-card">
          <div className="section-headline compact">
            <div>
              <h3>Fields To Export</h3>
            </div>
            <div className="toolbar-row">
              <button type="button" className="ghost-button small" onClick={() => setSelectedKeys(columns.map((column) => column.key))}>
                Select All
              </button>
              <button type="button" className="ghost-button small" onClick={() => setSelectedKeys([])}>
                Clear
              </button>
            </div>
          </div>

          <div className="export-field-grid">
            {columns.map((column) => (
              <label key={column.key} className="export-field-option">
                <input
                  type="checkbox"
                  checked={selectedKeys.includes(column.key)}
                  onChange={() => toggleField(column.key)}
                />
                <span>{column.header}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="surface-card export-summary-card">
          <p className="export-summary-line">{summaryLine}</p>
        </section>

        <div className="modal-actions">
          <button type="button" className="ghost-button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="primary-button" onClick={handleExport} disabled={exporting}>
            {exporting ? "Generating..." : `Export ${format.toUpperCase()}`}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
