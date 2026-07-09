import React, { useState } from "react";

const WHATSAPP_LINK = "https://wa.me/971562445357";

export default function LeadCaptureForm() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [budget, setBudget] = useState("");
  const [submittedName, setSubmittedName] = useState("");

  const isSubmitted = Boolean(submittedName);

  const handleSubmit = (event) => {
    event.preventDefault();
    const firstName = name.trim().split(" ")[0];
    setSubmittedName(firstName || "there");
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
      <form onSubmit={handleSubmit} className="landing-lead-form">
        <h3>Request your shortlist</h3>
        <p>Takes under a minute.</p>
        <label>
          <span>Full name</span>
          <input
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
            value={contact}
            onChange={(event) => setContact(event.target.value)}
            type="text"
            required
            placeholder="you@email.com or +971…"
          />
        </label>
        <label>
          <span>Budget</span>
          <select value={budget} onChange={(event) => setBudget(event.target.value)}>
            <option value="">Select budget range</option>
            <option value="under-1m">Under AED 1M</option>
            <option value="1-2m">AED 1M – 2M</option>
            <option value="2-4m">AED 2M – 4M</option>
            <option value="4m-plus">AED 4M+</option>
          </select>
        </label>
        <button type="submit">Send me the shortlist</button>
        <small>By submitting you agree to be contacted about off-plan opportunities.</small>
      </form>
    </div>
  );
}
