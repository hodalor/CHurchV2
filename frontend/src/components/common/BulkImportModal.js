import { useMemo, useState } from "react";
import ModalShell from "./ModalShell";
import { churchApi } from "../../apis/churchApi";
import { useAppContext } from "../../context/AppContext";

const ENTITY_COPY = {
  members: {
    title: "Bulk Import Members",
    subtitle: "Download the member template, fill the required columns, preview the rows, then confirm the import.",
    required: ["firstName", "lastName", "gender", "phone", "residentialArea", "membershipStatus"],
  },
  households: {
    title: "Bulk Import Households",
    subtitle: "Use member IDs that already exist in the system, preview the resolved household rows, then confirm.",
    required: ["familyName", "physicalAddress"],
  },
  ministrymembers: {
    title: "Bulk Import Ministry Members",
    subtitle: "Assign existing members into ministries or leadership slots from one template.",
    required: ["ministryName", "memberId"],
  },
};

export default function BulkImportModal({ entity, onClose }) {
  const { notifyError, notifySuccess, notifyWarning, refreshMembers, refreshFamilies, refreshMinistries } = useAppContext();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const copy = ENTITY_COPY[entity] || ENTITY_COPY.members;

  const previewColumns = useMemo(() => {
    const firstRow = preview?.rows?.[0]?.preview;
    return firstRow ? Object.keys(firstRow) : [];
  }, [preview]);

  const handleDownloadTemplate = async () => {
    try {
      setActionMessage("");
      const text = await churchApi.downloadImportTemplate(entity);
      const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${entity}-import-template.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      notifySuccess("Template downloaded successfully.");
    } catch (error) {
      notifyError(error.message || "Unable to download template.");
    }
  };

  const handlePreview = async () => {
    if (!file) {
      setActionMessage("Choose a CSV file before previewing.");
      notifyError("Choose a CSV file before previewing.");
      return;
    }

    try {
      setLoading(true);
      setActionMessage("");
      const response = await churchApi.previewImport(entity, file);
      setPreview(response);
      if ((response.summary?.invalidRows || 0) > 0) {
        const message = `${response.summary.invalidRows} row(s) need attention before import. The Validation column is about import checks, not membership status.`;
        setActionMessage(message);
        notifyWarning(message);
      } else {
        notifySuccess("Import preview generated.");
      }
    } catch (error) {
      setActionMessage(error.message || "Unable to preview import.");
      notifyError(error.message || "Unable to preview import.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!preview?.rows?.length) {
      setActionMessage("Preview the file before confirming the import.");
      notifyError("Preview the file before confirming the import.");
      return;
    }

    if ((preview.summary?.invalidRows || 0) > 0) {
      const message = `Import is blocked because ${preview.summary.invalidRows} row(s) are failing validation. Check the Errors column and preview again after fixing the file.`;
      setActionMessage(message);
      notifyError(message);
      return;
    }

    try {
      setLoading(true);
      setActionMessage("");
      const result = await churchApi.commitImport(entity, preview.rows);
      notifySuccess(`${result.importedCount || 0} records imported successfully.`);

      try {
        if (entity === "members") {
          await refreshMembers();
        } else if (entity === "households") {
          await Promise.all([refreshFamilies(), refreshMembers()]);
        } else if (entity === "ministrymembers") {
          await Promise.all([refreshMinistries(), refreshMembers()]);
        }
      } catch (refreshError) {
        notifyWarning(refreshError.message || "Import completed, but the page could not refresh automatically.");
      }

      window.setTimeout(() => {
        onClose();
      }, 120);
    } catch (error) {
      setActionMessage(error.message || "Unable to complete import.");
      notifyError(error.message || "Unable to complete import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell title={copy.title} subtitle={copy.subtitle} onClose={onClose}>
      <div className="modal-form">
        <div className="soft-note">
          Required columns: <strong>{copy.required.join(", ")}</strong>
        </div>

        <div className="soft-note">
          <strong>Ready</strong> / <strong>Needs attention</strong> refers to import validation only. It does not mean the member&apos;s
          <strong> membershipStatus</strong> value is invalid by itself.
        </div>

        {actionMessage ? <div className="form-error">{actionMessage}</div> : null}

        <div className="toolbar-row">
          <button type="button" className="ghost-button" onClick={handleDownloadTemplate} disabled={loading}>
            Download Template
          </button>
          <label className="ghost-button import-file-button">
            Choose CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="upload-input"
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                setPreview(null);
              }}
            />
          </label>
          <button type="button" className="primary-button" onClick={handlePreview} disabled={loading || !file}>
            Preview Import
          </button>
        </div>

        {file ? <div className="empty-note">Selected file: {file.name}</div> : null}

        {preview ? (
          <>
            <div className="compact-stats-grid">
              <article className="compact-stat-card purple">
                <div className="compact-stat-label">Rows</div>
                <div className="compact-stat-value">{preview.summary?.totalRows || 0}</div>
              </article>
              <article className="compact-stat-card blue">
                <div className="compact-stat-label">Valid</div>
                <div className="compact-stat-value">{preview.summary?.validRows || 0}</div>
              </article>
              <article className="compact-stat-card pink">
                <div className="compact-stat-label">Invalid</div>
                <div className="compact-stat-value">{preview.summary?.invalidRows || 0}</div>
              </article>
            </div>

            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    {previewColumns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                    <th>Validation</th>
                    <th>Warnings</th>
                    <th>Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rows.map((row) => (
                    <tr key={`${row.rowNumber}-${row.preview?.firstName || row.preview?.familyName || row.preview?.memberId || "row"}`}>
                      <td>{row.rowNumber}</td>
                      {previewColumns.map((column) => (
                        <td key={`${row.rowNumber}-${column}`}>{row.preview?.[column] || "-"}</td>
                      ))}
                      <td>
                        <span className={`status-pill ${row.valid ? "active" : "inactive"}`}>
                          {row.valid ? "Ready" : "Needs attention"}
                        </span>
                      </td>
                      <td>{row.warnings?.join(" | ") || "-"}</td>
                      <td>{row.errors?.join(" | ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="modal-actions align-end">
              <button
                type="button"
                className="primary-button"
                onClick={handleImport}
                disabled={loading}
              >
                Confirm Import
              </button>
            </div>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}
