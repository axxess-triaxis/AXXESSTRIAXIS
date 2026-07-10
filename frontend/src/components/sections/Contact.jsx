import { useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ASSETS } from "@/lib/brand";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const inquiryTypes = [
  { value: "investor", label: "Investor / VC" },
  { value: "enterprise", label: "Enterprise / Institution" },
  { value: "partner", label: "Strategic partner" },
  { value: "press", label: "Press & media" },
  { value: "general", label: "General" },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    organization: "",
    inquiry_type: "investor",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in name, email and message.");
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/contact`, form);
      toast.success("Received. We reply within 48 hours.");
      setForm({
        name: "",
        email: "",
        organization: "",
        inquiry_type: "investor",
        message: "",
      });
    } catch (err) {
      const msg = err?.response?.data?.detail || "Something went wrong. Please try again.";
      toast.error(typeof msg === "string" ? msg : "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      data-testid="contact-section"
      className="relative bg-[color:var(--tx-ink-2)] text-white overflow-hidden"
    >
      <div className="absolute inset-0 bg-grid-dark opacity-60" aria-hidden />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 500px at 90% 10%, rgba(59,130,246,0.14), transparent 60%)",
        }}
        aria-hidden
      />
      <img
        src={ASSETS.axxessIcon}
        alt=""
        aria-hidden
        className="pointer-events-none select-none absolute -left-32 -bottom-32 w-[440px] opacity-[0.08]"
      />
      <div className="noise-overlay" aria-hidden />

      <div className="relative max-w-[1400px] mx-auto px-6 md:px-10 py-24 md:py-36 grid md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="eyebrow-dark mb-6">10 · Get in touch</div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7 }}
            className="font-serif font-light text-[38px] md:text-[56px] leading-[1.04] tracking-tight"
          >
            Build with us.
            <br />
            <span className="italic text-white/85">Or back us.</span>
          </motion.h2>

          <div className="mt-10 space-y-6 text-[14.5px] text-white/70">
            <div>
              <div className="eyebrow-dark mb-2">Investors</div>
              <a
                href="mailto:investors@triaxisventures.com"
                className="text-white hover:text-[color:var(--tx-blue)] transition-colors"
              >
                investors@triaxisventures.com
              </a>
            </div>
            <div>
              <div className="eyebrow-dark mb-2">Enterprise & regulators</div>
              <a
                href="mailto:enterprise@triaxisventures.com"
                className="text-white hover:text-[color:var(--tx-blue)] transition-colors"
              >
                enterprise@triaxisventures.com
              </a>
            </div>
            <div>
              <div className="eyebrow-dark mb-2">Press</div>
              <a
                href="mailto:press@triaxisventures.com"
                className="text-white hover:text-[color:var(--tx-blue)] transition-colors"
              >
                press@triaxisventures.com
              </a>
            </div>
            <div>
              <div className="eyebrow-dark mb-2">Registered</div>
              <div className="text-white/80">
                Triaxis Ventures · Guwahati, Assam · India
                <br />
                <span className="text-white/50">Establishing DIFC & ADGM presence · 2026</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7">
          <form
            onSubmit={submit}
            data-testid="contact-form"
            noValidate
            className="border border-white/12 bg-black/40 backdrop-blur-sm p-6 md:p-10"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <Field label="Name" htmlFor="c-name">
                <input
                  id="c-name"
                  type="text"
                  value={form.name}
                  onChange={update("name")}
                  data-testid="contact-input-name"
                  className={inputClass}
                  placeholder="Your name"
                />
              </Field>
              <Field label="Email" htmlFor="c-email">
                <input
                  id="c-email"
                  type="email"
                  value={form.email}
                  onChange={update("email")}
                  data-testid="contact-input-email"
                  className={inputClass}
                  placeholder="you@fund.com"
                />
              </Field>
              <Field label="Organization" htmlFor="c-org">
                <input
                  id="c-org"
                  type="text"
                  value={form.organization}
                  onChange={update("organization")}
                  data-testid="contact-input-org"
                  className={inputClass}
                  placeholder="Fund / Enterprise"
                />
              </Field>
              <Field label="Inquiry type" htmlFor="c-type">
                <div className="relative">
                  <select
                    id="c-type"
                    value={form.inquiry_type}
                    onChange={update("inquiry_type")}
                    data-testid="contact-input-type"
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    {inquiryTypes.map((o) => (
                      <option key={o.value} value={o.value} className="bg-[#0A0A0A]">
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50">
                    ▾
                  </span>
                </div>
              </Field>
            </div>
            <div className="mt-6">
              <Field label="Message" htmlFor="c-msg">
                <textarea
                  id="c-msg"
                  rows={5}
                  value={form.message}
                  onChange={update("message")}
                  data-testid="contact-input-message"
                  className={`${inputClass} resize-none`}
                  placeholder="Fund thesis, enterprise mandate, or how we can be useful."
                />
              </Field>
            </div>

            <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="font-mono text-[11px] tracking-widest uppercase text-white/50">
                Encrypted transport · Reviewed within 48h
              </div>
              <button
                type="submit"
                disabled={submitting}
                data-testid="contact-submit"
                className="inline-flex items-center justify-center gap-2 text-[14px] font-medium bg-white text-black px-6 py-3.5 hover:bg-white/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors rounded-sm"
              >
                {submitting ? "Sending…" : "Send message"}
                <span aria-hidden>→</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

const inputClass =
  "w-full bg-transparent border border-white/15 text-white placeholder:text-white/35 text-[14.5px] px-4 py-3 rounded-sm focus:outline-none focus:border-white/60 focus:ring-0 transition-colors";

function Field({ label, htmlFor, children }) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="font-mono text-[11px] tracking-widest uppercase text-white/55 mb-2 block">
        {label}
      </span>
      {children}
    </label>
  );
}
