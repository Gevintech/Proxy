const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Config ---
const RELWORX_BASE = "https://payments.relworx.com/api";
const RELWORX_API_KEY = process.env.RELWORX_API_KEY;
const RELWORX_ACCOUNT_NO = process.env.RELWORX_ACCOUNT_NO;
const PROXY_SECRET = process.env.PROXY_SECRET; // shared secret between edge fn & proxy

// --- Middleware ---
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`${req.method} ${req.path} ${res.statusCode} ${Date.now() - start}ms`);
  });
  next();
});

// Auth middleware — verify shared secret
function authenticate(req, res, next) {
  const authHeader = req.headers["x-proxy-secret"];
  if (!PROXY_SECRET || authHeader !== PROXY_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// --- Helper: call Relworx ---
async function relworxRequest(method, path, body = null, query = null) {
  let url = `${RELWORX_BASE}${path}`;
  if (query) {
    const params = new URLSearchParams(query);
    url += `?${params.toString()}`;
  }

  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/vnd.relworx.v2",
      Authorization: `Bearer ${RELWORX_API_KEY}`,
    },
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  const data = await response.json();
  return { status: response.status, data };
}

// --- Routes ---

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "rellpay-proxy", timestamp: new Date().toISOString() });
});

// Collect money (request payment)
app.post("/relworx/collect", authenticate, async (req, res) => {
  try {
    const { msisdn, amount, currency, description, reference } = req.body;

    if (!msisdn || !amount || !currency) {
      return res.status(400).json({ error: "msisdn, amount, and currency are required" });
    }

    const accountNo = req.body.account_no || RELWORX_ACCOUNT_NO;
    const payload = {
      account_no: accountNo,
      reference: reference || crypto.randomUUID().replace(/-/g, "").slice(0, 36),
      msisdn,
      currency,
      amount: parseFloat(amount),
      description: description || "",
    };

    console.log(`[COLLECT] ${msisdn} ${currency} ${amount}`);
    const { status, data } = await relworxRequest("POST", "/mobile-money/request-payment", payload);
    res.status(status).json(data);
  } catch (err) {
    console.error("[COLLECT ERROR]", err.message);
    res.status(500).json({ error: "Proxy error", message: err.message });
  }
});

// Send money (payout)
app.post("/relworx/send", authenticate, async (req, res) => {
  try {
    const { msisdn, amount, currency, description, reference } = req.body;

    if (!msisdn || !amount || !currency) {
      return res.status(400).json({ error: "msisdn, amount, and currency are required" });
    }

    const accountNo = req.body.account_no || RELWORX_ACCOUNT_NO;
    const payload = {
      account_no: accountNo,
      reference: reference || crypto.randomUUID().replace(/-/g, "").slice(0, 36),
      msisdn,
      currency,
      amount: parseFloat(amount),
      description: description || "",
    };

    console.log(`[SEND] ${msisdn} ${currency} ${amount}`);
    const { status, data } = await relworxRequest("POST", "/mobile-money/send-payment", payload);
    res.status(status).json(data);
  } catch (err) {
    console.error("[SEND ERROR]", err.message);
    res.status(500).json({ error: "Proxy error", message: err.message });
  }
});

// Check transaction status
app.post("/relworx/status", authenticate, async (req, res) => {
  try {
    const { internal_reference } = req.body;

    if (!internal_reference) {
      return res.status(400).json({ error: "internal_reference is required" });
    }

    const accountNo = req.body.account_no || RELWORX_ACCOUNT_NO;
    console.log(`[STATUS] ${internal_reference}`);
    const { status, data } = await relworxRequest("GET", "/mobile-money/check-request-status", null, {
      account_no: accountNo,
      internal_reference,
    });
    res.status(status).json(data);
  } catch (err) {
    console.error("[STATUS ERROR]", err.message);
    res.status(500).json({ error: "Proxy error", message: err.message });
  }
});

// Check wallet balance
app.post("/relworx/balance", authenticate, async (req, res) => {
  try {
    const currency = req.body.currency || "KES";
    const accountNo = req.body.account_no || RELWORX_ACCOUNT_NO;

    console.log(`[BALANCE] ${currency}`);
    const { status, data } = await relworxRequest("GET", "/mobile-money/check-wallet-balance", null, {
      account_no: accountNo,
      currency,
    });
    res.status(status).json(data);
  } catch (err) {
    console.error("[BALANCE ERROR]", err.message);
    res.status(500).json({ error: "Proxy error", message: err.message });
  }
});

// --- Start ---
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ RellPay Proxy running on port ${PORT}`);
  console.log(`   Account: ${RELWORX_ACCOUNT_NO}`);
  console.log(`   API Key: ${RELWORX_API_KEY ? "configured" : "⚠️  MISSING"}`);
  console.log(`   Proxy Secret: ${PROXY_SECRET ? "configured" : "⚠️  MISSING"}`);
});
