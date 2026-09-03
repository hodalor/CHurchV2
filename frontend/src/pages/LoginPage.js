import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, authError, setAuthError } = useAuth();
  const [form, setForm] = useState({ churchId: "", username: "", pin: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setAuthError("");

    try {
      await login(form);
    } catch (error) {
      setAuthError(error.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit}>
        <p className="section-label">ChurchFlow Admin</p>
        <h1>PRYNOVA</h1>
        {/* <p className="login-copy">
          We are using the new session flow now, so visitor records, audit logs, and admin lookups stay protected.
        </p> */}

        <div className="login-field">
          <input
            value={form.churchId}
            onChange={(event) => setForm((current) => ({ ...current, churchId: event.target.value }))}
            placeholder="CHURCH ID"
          />
        </div>

        <div className="login-field">
          <input
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
            placeholder="USERNAME"
          />
        </div>

        <div className="login-field">
          <input
            type="password"
            value={form.pin}
            onChange={(event) => setForm((current) => ({ ...current, pin: event.target.value }))}
            placeholder="PIN"
          />
        </div>

        {authError ? <div className="form-error">{authError}</div> : null}

        <button type="submit" className="primary-button login-button" disabled={submitting}>
          {submitting ? "Signing In..." : "Sign In"}
        </button>

       
      </form>
    </div>
  );
}
