# Ghostwriter Swarm 🐝

Ghostwriter Swarm is an agentic AI workflow designed to turn any topic into a viral social media thread and a professional Gmail draft. It uses a "swarm" of specialized AI agents to handle trend analysis, critical thinking, creative writing, and distribution.

## 🚀 The 4-Step Agentic Workflow

1.  **Trend Spotter (Gemini 3.1 Flash Lite)**: Scrapes the web and analyzes current AI news and trends related to your topic.
2.  **The Hater (Gemini 3.1 Flash Lite)**: Finds a witty, contrarian, or critical perspective on the trend to ensure your content stands out.
3.  **Viral Specialist (Gemini 3.1 Pro)**: Combines the trend and the "hater" take into a high-engagement X (Twitter) thread.
4.  **Publisher (Gmail API)**: Automatically creates a formatted draft in your Gmail account, ready for you to review and send.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite), Tailwind CSS, Framer Motion (animations), Lucide React (icons).
-   **Backend**: Node.js (Express), Google OAuth 2.0, Gmail API.
-   **AI Models**: Google Gemini 3.1 Flash Lite & Gemini 3.1 Pro.

## ⚙️ Setup & Configuration

To run this project locally or deploy it, you'll need to configure the following environment variables:

### 1. Gemini API Key
Get your free API key from [Google AI Studio](https://aistudio.google.com/).
-   `GEMINI_API_KEY`: Your Gemini API key.

### 2. Google OAuth (for Gmail API)
1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project and enable the **Gmail API**.
3.  Configure the **OAuth Consent Screen** (add `https://www.googleapis.com/auth/gmail.compose` scope).
4.  Create **OAuth 2.0 Client IDs** (Web application).
5.  Add your app's URL to the **Authorized Redirect URIs** (e.g., `http://localhost:3000/auth/callback`).
-   `GOOGLE_CLIENT_ID`: Your Google Client ID.
-   `GOOGLE_CLIENT_SECRET`: Your Google Client Secret.

### 3. Session Security
-   `SESSION_SECRET`: A random string used to secure your session cookies.

## 📦 Installation

1.  Clone the repository.
2.  Install dependencies: `npm install`.
3.  Create a `.env` file based on `.env.example`.
4.  Start the development server: `npm run dev`.

## 📄 License

MIT License.
