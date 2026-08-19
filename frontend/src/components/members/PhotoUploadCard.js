import { FaCamera, FaIdCard, FaImage } from "react-icons/fa";

export default function PhotoUploadCard({
  title,
  description,
  value,
  actionLabel,
  placeholder,
  onFileChange,
  round,
  type = "photo",
  uploading = false,
}) {
  const Icon = type === "id" ? FaIdCard : FaImage;
  const resolvedValue = typeof value === "object" && value?.url ? value : null;
  const previewLabel = resolvedValue?.label || (typeof value === "string" ? value : "");

  return (
    <div className="upload-card">
      <div className="upload-copy">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      <div className={round ? "upload-preview round" : "upload-preview"}>
        {resolvedValue?.url ? (
          <a href={resolvedValue.url} target="_blank" rel="noreferrer">
            {previewLabel}
          </a>
        ) : (
          previewLabel || placeholder
        )}
      </div>

      <div className="upload-actions">
        {round ? (
          <button type="button" className="ghost-button small" disabled={uploading}>
            <FaCamera />
            Take Photo
          </button>
        ) : null}
        <label className="ghost-button small">
          <Icon />
          {uploading ? "Uploading..." : actionLabel}
          <input
            className="upload-input"
            type="file"
            accept="image/*"
            onChange={onFileChange}
            disabled={uploading}
          />
        </label>
      </div>
    </div>
  );
}
