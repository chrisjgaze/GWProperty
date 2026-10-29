import React, { useState } from "react";

const WHATSAPP_LINK = "https://wa.me/971562445357";

// Must match the hidden detection form in src/pages/index.astro.
export const LEAD_FORM_NAME = "investor-shortlist";

function encodeForm(data) {
  return new URLSearchParams(data).toString();
}

export default function LeadCaptureForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [budget, setBudget] = useState("");
  const [botField, setBotField] = useState("");
  const [submittedName, setSubmittedName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const isSubmitted = Boolean(submittedName);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");

    try {
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: encodeForm({
          "form-name": LEAD_FORM_NAME,
          "bot-field": botField,
          name: name.trim(),
          contact: contact.trim(),
          budget,
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const firstName = name.trim().split(" ")[0];
      setSubmittedName(firstName || "there");
    } catch (err) {
      console.error("[LEAD FORM]", err);
      setError("Sorry, that didn't send. Please try again or message us on WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="landing-form-card">
        <div className="landing-form-success">
          <div>✓</div>
          <h3>Thank you, {submittedName}.</h3>
          <p>Your personalised shortlist is on its way. An advisor will reach out within 24 hours.</p>
          <a href={WHATSAPP_LINK}>Chat now on WhatsApp</a>
        </div>
      </div>
    );
  }

  return (
    <div className="landing-form-card">
      <form name={LEAD_FORM_NAME} onSubmit={handleSubmit} className="landing-lead-form">
        <h3>Request your shortlist</h3>
        <p>Takes under a minute.</p>
        <label className="landing-form-honeypot" aria-hidden="true">
          <span>Leave this empty</span>
          <input
            name="bot-field"
            value={botField}
            onChange={(event) => setBotField(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <label>
          <span>Full name</span>
          <input
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            required
            placeholder="Your name"
          />
        </label>
        <label>
          <span>Email or phone</span>
          <input
            name="contact"
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            type="text"
            required
            placeholder="you@email.com or +971…"
          />
        </label>
        <label>
          <span>Budget</span>
          <select name="budget" value={budget} onChange={(event) => setBudget(event.target.value)}>
            <option value="">Select budget range</option>
            <option value="under-1m">Under AED 1M</option>
            <option value="1-2m">AED 1M – 2M</option>
            <option value="2-4m">AED 2M – 4M</option>
            <option value="4m-plus">AED 4M+</option>
          </select>
        </label>
        {error && (
          <p className="landing-form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={sending}>
          {sending ? "Sending…" : "Send me the shortlist"}
        </button>
        <small>By submitting you agree to be contacted about off-plan opportunities.</small>
      </form>
    </div>
  );
}
