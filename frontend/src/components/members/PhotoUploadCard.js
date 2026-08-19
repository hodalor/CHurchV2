import { FaCamera, FaIdCard, FaImage } from "react-icons/fa";

export default function PhotoUploadCard({
  title,
  description,
  value,
  placeholder,
  actionLabel,
  onChange,
  round,
  type = "photo",
}) {
  const Icon = type === "id" ? FaIdCard : FaImage;

  return (
    <div className="upload-card">
      <div className="upload-copy">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>

      <div className={round ? "upload-preview round" : "upload-preview"}>
        {value || placeholder}
      </div>

      <div className="upload-actions">
        {round ? (
          <button type="button" className="ghost-button small">
            <FaCamera />
            Take Photo
          </button>
        ) : null}
        <button type="button" className="ghost-button small">
          <Icon />
          {actionLabel}
        </button>
      </div>

      <input className="upload-input" type="text" value={value} onChange={onChange} placeholder={placeholder} />
    </div>
  );
}
