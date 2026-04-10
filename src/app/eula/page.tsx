import Link from "next/link";

export const metadata = {
  title: "End-User License Agreement | Pourdex",
  description: "Pourdex End-User License Agreement — Augmentation Consulting Group Inc.",
};

const EFFECTIVE_DATE = "April 10, 2026";
const COMPANY = "Augmentation Consulting Group Inc.";
const PRODUCT = "Pourdex";
const CONTACT_EMAIL = "legal@pourdex.com";
const WEBSITE = "www.pourdex.com";

export default function EulaPage() {
  return (
    <div style={{ background: "#0b1016", minHeight: "100vh", color: "#c9d1d9", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1f2732", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Link href="/" style={{ fontWeight: 800, fontSize: 18, color: "#d4a853", textDecoration: "none", letterSpacing: "-0.02em" }}>
          {PRODUCT}
        </Link>
        <Link href="/privacy" style={{ fontSize: 13, color: "#8b949e", textDecoration: "none" }}>
          Privacy Policy →
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "60px 32px 120px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "#d4a853", marginBottom: 12 }}>Legal</p>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em", marginBottom: 8 }}>
          End-User License Agreement
        </h1>
        <p style={{ fontSize: 13, color: "#8b949e", marginBottom: 48 }}>
          Effective Date: {EFFECTIVE_DATE} &nbsp;·&nbsp; {COMPANY}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 32, fontSize: 14, lineHeight: 1.75, color: "#c9d1d9" }}>

          <section>
            <p>
              This End-User License Agreement (&ldquo;Agreement&rdquo;) is a legal agreement between you (&ldquo;User&rdquo; or &ldquo;you&rdquo;)
              and <strong style={{ color: "#f0f6fc" }}>{COMPANY}</strong> (&ldquo;Company,&rdquo; &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;),
              the owner and operator of <strong style={{ color: "#f0f6fc" }}>{PRODUCT}</strong> (&ldquo;the Software&rdquo;), available at{" "}
              <strong style={{ color: "#f0f6fc" }}>{WEBSITE}</strong>. By accessing or using the Software, you agree to be bound by the terms of
              this Agreement. If you do not agree, do not use the Software.
            </p>
          </section>

          {[
            {
              title: "1. Grant of License",
              body: `Subject to your compliance with this Agreement and payment of applicable fees, ${COMPANY} grants you a limited, non-exclusive, non-transferable, revocable license to access and use ${PRODUCT} solely for your internal business operations (bar, restaurant, or hospitality management). This license does not include any right to sublicense, resell, or redistribute the Software.`,
            },
            {
              title: "2. Subscription and Payment",
              body: `Access to ${PRODUCT} requires a paid subscription. Subscription fees are billed monthly at the rate presented at the time of purchase. You authorize ${COMPANY} to charge your designated payment method on a recurring basis. All fees are non-refundable except as required by applicable law. ${COMPANY} reserves the right to change pricing with 30 days' notice. Failure to pay may result in suspension or termination of access.`,
            },
            {
              title: "3. Free Trial",
              body: `${COMPANY} may offer a free trial period of up to 14 days. At the end of the trial, your subscription will automatically continue at the standard monthly rate unless you cancel before the trial period ends. You will be notified of the upcoming charge by email.`,
            },
            {
              title: "4. Restrictions",
              body: `You may not: (a) copy, modify, or create derivative works of the Software; (b) reverse engineer, decompile, or disassemble any portion of the Software; (c) rent, lease, sell, resell, transfer, or sublicense access to the Software to any third party; (d) use the Software for any unlawful purpose or in violation of any applicable laws or regulations; (e) use the Software to store or transmit malicious code; (f) interfere with or disrupt the integrity or performance of the Software or its underlying infrastructure; or (g) attempt to gain unauthorized access to the Software or its related systems.`,
            },
            {
              title: "5. Ownership and Intellectual Property",
              body: `The Software, including all content, features, functionality, code, designs, and trademarks, is and remains the exclusive property of ${COMPANY} and its licensors. This Agreement does not convey to you any ownership interest in the Software. All rights not expressly granted herein are reserved by ${COMPANY}.`,
            },
            {
              title: "6. Your Data",
              body: `You retain ownership of all data you upload, enter, or generate within the Software (&ldquo;Your Data&rdquo;). You grant ${COMPANY} a limited license to store, process, and use Your Data solely to provide the Software's services to you. ${COMPANY} will not sell Your Data to third parties. Please refer to our Privacy Policy for full details on how we handle your data.`,
            },
            {
              title: "7. Confidentiality",
              body: `Each party agrees to keep confidential any non-public information disclosed by the other party in connection with this Agreement and to use such information only as necessary to perform under this Agreement. This obligation does not apply to information that: (a) is or becomes publicly available through no fault of the receiving party; (b) was already known to the receiving party; or (c) is required to be disclosed by law or court order.`,
            },
            {
              title: "8. Disclaimers",
              body: `THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. ${COMPANY.toUpperCase()} DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS. AI-GENERATED INSIGHTS ARE ADVISORY ONLY AND SHOULD NOT BE RELIED UPON AS LEGAL, FINANCIAL, OR COMPLIANCE ADVICE.`,
            },
            {
              title: "9. Limitation of Liability",
              body: `TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ${COMPANY.toUpperCase()} BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO THIS AGREEMENT OR YOUR USE OF THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. ${COMPANY.toUpperCase()}'S TOTAL CUMULATIVE LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.`,
            },
            {
              title: "10. Indemnification",
              body: `You agree to indemnify, defend, and hold harmless ${COMPANY} and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses (including reasonable attorneys' fees) arising out of or related to: (a) your use of the Software in violation of this Agreement; (b) Your Data; or (c) your violation of any applicable law or regulation.`,
            },
            {
              title: "11. Term and Termination",
              body: `This Agreement is effective from the date you first access the Software and continues until terminated. Either party may terminate this Agreement at any time. ${COMPANY} may suspend or terminate your access immediately if you breach this Agreement or fail to pay applicable fees. Upon termination, your license to use the Software ceases immediately. Sections 5, 8, 9, 10, and 12 survive termination.`,
            },
            {
              title: "12. Governing Law and Disputes",
              body: `This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law principles. Any dispute arising under this Agreement shall be resolved exclusively through binding arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules, with proceedings conducted in English. Nothing in this section shall prevent either party from seeking injunctive or equitable relief in any court of competent jurisdiction.`,
            },
            {
              title: "13. Modifications",
              body: `${COMPANY} reserves the right to modify this Agreement at any time. We will provide at least 14 days' notice of material changes via email or in-app notification. Your continued use of the Software after the effective date of changes constitutes acceptance of the revised Agreement.`,
            },
            {
              title: "14. Entire Agreement",
              body: `This Agreement, together with the Privacy Policy, constitutes the entire agreement between you and ${COMPANY} with respect to the Software and supersedes all prior agreements, representations, and understandings. If any provision of this Agreement is held invalid or unenforceable, the remaining provisions shall continue in full force and effect.`,
            },
          ].map(({ title, body }) => (
            <section key={title}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 10 }}>{title}</h2>
              <p dangerouslySetInnerHTML={{ __html: body }} />
            </section>
          ))}

          <section style={{ borderTop: "1px solid #1f2732", paddingTop: 24 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "#f0f6fc", marginBottom: 10 }}>15. Contact</h2>
            <p>
              If you have questions about this Agreement, please contact us at:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: "#d4a853" }}>{CONTACT_EMAIL}</a>
              <br />
              {COMPANY}<br />
              {WEBSITE}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
