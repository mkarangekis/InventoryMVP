import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Pourdex",
  description: "Pourdex Privacy Policy — Augmentation Consulting Group Inc.",
};

const EFFECTIVE_DATE = "April 10, 2026";
const COMPANY = "Augmentation Consulting Group Inc.";
const PRODUCT = "Pourdex";
const CONTACT_EMAIL = "privacy@pourdex.com";
const WEBSITE = "www.pourdex.com";

export default function PrivacyPage() {
  return (
    <div style={{ background: "#0b1016", minHeight: "100vh", color: "#c9d1d9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f2732", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: "#d4a853", textDecoration: "none", letterSpacing: "-0.02em" }}>
          {PRODUCT}
        </Link>
        <Link href="/eula" style={{ fontSize: 13, color: "#8b949e", textDecoration: "none" }}>
          EULA →
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px 120px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 12 }}>Legal</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: "#8b949e", marginBottom: 48 }}>
          Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; {COMPANY}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: 14, lineHeight: 1.75, color: "#c9d1d9" }}>

          <section>
            <p>
              <strong style={{ color: "#f0f6fc" }}>{COMPANY}</strong> (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
              operates <strong style={{ color: "#f0f6fc" }}>{PRODUCT}</strong> (&ldquo;the Service&rdquo;) at{" "}
              <strong style={{ color: "#f0f6fc" }}>{WEBSITE}</strong>. This Privacy Policy explains what information we collect, how we use it,
              and your rights with respect to that information. By using the Service, you agree to the practices described in this Policy.
            </p>
          </section>

          {[
            {
              title: "1. Information We Collect",
              body: `<strong style="color:#f0f6fc">Account Information:</strong> When you register, we collect your name, email address, and password (stored in hashed form).<br/><br/>
<strong style="color:#f0f6fc">Business Data:</strong> Information you input into the Service including inventory items, menu items, sales data, purchase orders, vendor details, and location information.<br/><br/>
<strong style="color:#f0f6fc">Usage Data:</strong> We collect logs of actions taken within the Service (audit trail) including the type of action, timestamp, and associated entity — used for security, compliance, and product improvement.<br/><br/>
<strong style="color:#f0f6fc">Billing Information:</strong> We collect billing status and subscription identifiers. Payment card details are processed directly by our payment processor and are not stored on our servers.<br/><br/>
<strong style="color:#f0f6fc">Communications:</strong> If you contact us for support, we retain the content of that communication.<br/><br/>
<strong style="color:#f0f6fc">Technical Data:</strong> IP address, browser type, device identifiers, and standard server log data collected automatically when you access the Service.`,
            },
            {
              title: "2. How We Use Your Information",
              body: `We use your information to:<br/>
(a) Provide, operate, and maintain the Service;<br/>
(b) Process transactions and manage your subscription;<br/>
(c) Send transactional emails, including invoices, trial expiration notices, and account alerts;<br/>
(d) Generate AI-powered insights based on your business data;<br/>
(e) Improve and develop new features of the Service;<br/>
(f) Detect, investigate, and prevent fraudulent or unauthorized activity;<br/>
(g) Comply with applicable legal obligations;<br/>
(h) Respond to your support requests.`,
            },
            {
              title: "3. AI Features and Your Data",
              body: `${PRODUCT} uses AI models to generate operational insights, forecasts, and recommendations based on your business data. Your data is used to generate these insights on your behalf. We do not use your business data to train general-purpose AI models for third parties. AI-generated outputs are advisory and should be reviewed by qualified personnel before acting upon them.`,
            },
            {
              title: "4. Data Sharing and Disclosure",
              body: `We do not sell your personal information. We may share your information with:<br/><br/>
<strong style="color:#f0f6fc">Service Providers:</strong> Third-party vendors who assist us in operating the Service, including cloud hosting (Vercel, Supabase), payment processing (QuickBooks Payments), email delivery, and AI model providers. These providers are contractually obligated to protect your information and use it only for the services they provide to us.<br/><br/>
<strong style="color:#f0f6fc">Legal Requirements:</strong> We may disclose your information if required by law, subpoena, or other legal process, or if we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, or investigate fraud.<br/><br/>
<strong style="color:#f0f6fc">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email and/or prominent notice on the Service prior to such transfer.`,
            },
            {
              title: "5. Data Retention",
              body: `We retain your account and business data for as long as your account is active or as needed to provide the Service. If you terminate your account, we will delete or anonymize your personal data within 90 days, unless we are required to retain it for legal or compliance purposes. Audit log data may be retained for up to 3 years for security and compliance purposes.`,
            },
            {
              title: "6. Data Security",
              body: `We implement industry-standard security measures to protect your data, including encryption in transit (TLS), encryption at rest, role-based access controls, and row-level security policies in our database. No method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security. You are responsible for maintaining the security of your account credentials.`,
            },
            {
              title: "7. Your Rights",
              body: `Depending on your jurisdiction, you may have the following rights regarding your personal data:<br/>
(a) <strong style="color:#f0f6fc">Access:</strong> Request a copy of the personal data we hold about you;<br/>
(b) <strong style="color:#f0f6fc">Correction:</strong> Request correction of inaccurate or incomplete data;<br/>
(c) <strong style="color:#f0f6fc">Deletion:</strong> Request deletion of your personal data, subject to legal retention requirements;<br/>
(d) <strong style="color:#f0f6fc">Portability:</strong> Request your data in a structured, machine-readable format;<br/>
(e) <strong style="color:#f0f6fc">Objection / Restriction:</strong> Object to or request restriction of certain processing activities.<br/><br/>
To exercise any of these rights, contact us at <a href="mailto:${CONTACT_EMAIL}" style="color:#d4a853">${CONTACT_EMAIL}</a>. We will respond within 30 days.`,
            },
            {
              title: "8. Cookies and Tracking",
              body: `The Service uses session cookies and local storage to maintain your authentication state and user preferences (such as selected location). We do not use third-party advertising cookies or tracking pixels. You may disable cookies in your browser settings, but doing so may prevent certain features of the Service from functioning correctly.`,
            },
            {
              title: "9. Children's Privacy",
              body: `The Service is not directed to individuals under the age of 18. We do not knowingly collect personal information from minors. If you become aware that a minor has provided us with personal information, please contact us and we will take steps to delete such information.`,
            },
            {
              title: "10. International Data Transfers",
              body: `${COMPANY} is based in the United States. If you access the Service from outside the United States, your information may be transferred to, stored, and processed in the United States and other countries where our service providers operate. By using the Service, you consent to such transfers. We take appropriate steps to ensure that your data receives adequate protection consistent with this Policy.`,
            },
            {
              title: "11. Third-Party Links",
              body: `The Service may contain links to third-party websites or services. This Privacy Policy does not apply to those third-party services, and we are not responsible for their privacy practices. We encourage you to review the privacy policies of any third-party services you access.`,
            },
            {
              title: "12. Changes to This Policy",
              body: `We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice within the Service at least 14 days before the changes take effect. Your continued use of the Service after the effective date of the updated Policy constitutes your acceptance of the changes.`,
            },
          ].map(({ title, body }) => (
            <section key={title}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 10 }}>{title}</h2>
              <p dangerouslySetInnerHTML={{ __html: body }} />
            </section>
          ))}

          <section style={{ borderTop: "1px solid #1f2732", paddingTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 10 }}>13. Contact Us</h2>
            <p>
              For privacy-related questions, requests, or concerns, please contact our Privacy team:<br /><br />
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#d4a853" }}>{CONTACT_EMAIL}</a><br />
              {COMPANY}<br />
              {WEBSITE}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
