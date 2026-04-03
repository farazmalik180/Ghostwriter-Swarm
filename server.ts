import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";
import cookieSession from "cookie-session";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.set("trust proxy", 1);
  app.use(express.json());
  app.use(
    cookieSession({
      name: "session",
      keys: [process.env.SESSION_SECRET || "default-secret"],
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: true,
      sameSite: "none",
    })
  );

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.APP_URL}/auth/callback`
  );

  const getRedirectUri = (req: express.Request) => {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host;
    return `${protocol}://${host}/auth/callback`;
  };

  // API Routes
  app.get("/api/auth/url", (req, res) => {
    const redirectUri = getRedirectUri(req);
    console.log(`[OAuth URL] Using redirect URI: ${redirectUri}`);
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.compose"],
      prompt: "consent",
      redirect_uri: redirectUri,
    });
    res.json({ url });
  });

  app.get("/api/auth/logout", (req, res) => {
    req.session = null;
    res.json({ status: "ok" });
  });

  app.get("/auth/callback", async (req, res) => {
    const { code } = req.query;
    const redirectUri = getRedirectUri(req);
    try {
      const { tokens } = await oauth2Client.getToken({
        code: code as string,
        redirect_uri: redirectUri,
      });
      req.session!.tokens = tokens;
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <p>Authentication successful. This window should close automatically.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Error exchanging code for tokens:", error);
      res.status(500).send("Authentication failed");
    }
  });

  app.get("/api/auth/status", (req, res) => {
    const hasTokens = !!req.session?.tokens;
    console.log(`[Auth Status] Session ID: ${req.session?.id}, Has Tokens: ${hasTokens}`);
    res.json({ isAuthenticated: hasTokens });
  });

  app.post("/api/gmail/draft", async (req, res) => {
    if (!req.session?.tokens) {
      console.error("[Gmail Draft] Error: No tokens found in session");
      return res.status(401).json({ error: "Not authenticated. Please disconnect and reconnect Gmail." });
    }

    const { subject, body } = req.body;
    oauth2Client.setCredentials(req.session.tokens);

    const gmail = google.gmail({ version: "v1", auth: oauth2Client });

    try {
      const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
      const message = [
        "Content-Type: text/plain; charset=\"UTF-8\"\r\n",
        "MIME-Version: 1.0\r\n",
        `Subject: ${utf8Subject}\r\n\r\n`,
        body,
      ].join("");

      const base64EncodedEmail = Buffer.from(message)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: base64EncodedEmail,
          },
        },
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating draft:", error);
      const errorMessage = error.response?.data?.error?.message || error.message || "Unknown error";
      res.status(500).json({ error: `Gmail API Error: ${errorMessage}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
