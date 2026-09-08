const https = require("https");

// Keep-alive agent to maintain persistent TLS socket connections to Brevo API
const brevoAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 60000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 10000,
});

/**
 * Sends a transactional email using Brevo (Sendinblue) REST API via HTTPS
 * 
 * @param {Object} options
 * @param {string|string[]|Object} options.to - Recipient email(s)
 * @param {string} [options.name] - Recipient name (optional)
 * @param {string} options.subject - Email subject line
 * @param {string} options.html - HTML body
 * @param {string} [options.text] - Plain text fallback (optional)
 * @returns {Promise<{ success: boolean, data?: any, notConfigured?: boolean, error?: string }>}
 */
function sendEmail({ to, name, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.BREVO_API_KEY;
    const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_USER || "sanyakhare253@gmail.com";
    const senderName = process.env.BREVO_SENDER_NAME || "InventoryPro";

    if (!apiKey || apiKey.trim() === "") {
      console.warn("⚠️ BREVO_API_KEY is not configured in .env");
      return resolve({ success: false, notConfigured: true });
    }

    // Format recipient list
    let recipients = [];
    if (Array.isArray(to)) {
      recipients = to.map((item) => (typeof item === "string" ? { email: item } : item));
    } else if (typeof to === "string") {
      recipients = [{ email: to, ...(name ? { name } : {}) }];
    } else if (to && to.email) {
      recipients = [to];
    } else {
      return reject(new Error("Invalid recipient email address"));
    }

    const payload = JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: recipients,
      subject: subject,
      htmlContent: html,
      ...(text ? { textContent: text } : {}),
    });

    const requestOptions = {
      hostname: "api.brevo.com",
      port: 443,
      path: "/v3/smtp/email",
      method: "POST",
      agent: brevoAgent,
      headers: {
        "api-key": apiKey.trim(),
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: 8000,
    };

    const req = https.request(requestOptions, (res) => {
      let responseBody = "";

      res.on("data", (chunk) => {
        responseBody += chunk;
      });

      res.on("end", () => {
        let parsedData = {};
        try {
          parsedData = JSON.parse(responseBody);
        } catch {
          parsedData = { raw: responseBody };
        }

        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`✅ [Brevo] Email sent successfully to ${recipients.map(r => r.email).join(", ")}`);
          return resolve({ success: true, data: parsedData });
        } else {
          const errMsg = parsedData.message || `Brevo API returned status ${res.statusCode}`;
          console.error(`❌ [Brevo API Error ${res.statusCode}]:`, errMsg);
          return reject(new Error(errMsg));
        }
      });
    });

    req.on("timeout", () => {
      req.destroy();
      console.error("❌ [Brevo Error]: Request timed out after 8 seconds");
      return reject(new Error("Brevo API request timed out"));
    });

    req.on("error", (err) => {
      console.error("❌ [Brevo Network Error]:", err.message);
      return reject(err);
    });

    req.write(payload);
    req.end();
  });
}

module.exports = {
  sendEmail,
};
