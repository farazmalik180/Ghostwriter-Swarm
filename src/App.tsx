import { useState, useEffect, useCallback } from "react";
import { GoogleGenAI } from "@google/genai";
import { 
  Search, 
  Zap, 
  Share2, 
  Mail, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  TrendingUp,
  Skull,
  Twitter,
  Send,
  LogOut,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/src/lib/utils";

// --- Types ---

type WorkflowStep = "idle" | "trending" | "hating" | "viral" | "publishing" | "completed";

interface StepResult {
  title: string;
  content: string;
  status: "pending" | "processing" | "success" | "error";
  error?: string;
}

// --- App Component ---

export default function App() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("idle");
  const [topic, setTopic] = useState("AI Agents and the future of work");
  const [results, setResults] = useState<Record<string, StepResult>>({
    trending: { title: "Trend Spotter", content: "", status: "pending" },
    hating: { title: "The Hater", content: "", status: "pending" },
    viral: { title: "Viral Specialist", content: "", status: "pending" },
    publishing: { title: "Publisher", content: "", status: "pending" },
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // --- Auth Logic ---

  const checkAuthStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/status");
      const data = await res.json();
      setIsAuthenticated(data.isAuthenticated);
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  }, []);

  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    setIsInIframe(window.self !== window.top);
    checkAuthStatus();
    
    const handleMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        console.log("OAuth Success received, verifying with server...");
        await checkAuthStatus();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkAuthStatus]);

  const handleConnect = async () => {
    try {
      const response = await fetch('/api/auth/url');
      const { url } = await response.json();
      window.open(url, 'oauth_popup', 'width=600,height=700');
    } catch (error) {
      console.error('OAuth error:', error);
    }
  };

  // --- Gemini Logic ---

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

  const handleDisconnect = async () => {
    try {
      await fetch("/api/auth/logout");
      setIsConnected(false);
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const runWorkflow = async () => {
    if (currentStep !== "idle" && currentStep !== "completed") return;
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "undefined") {
      setResults(prev => ({
        ...prev,
        trending: { ...prev.trending, status: "error", error: "Gemini API Key is missing or invalid. Please check your environment variables." }
      }));
      return;
    }

    setCurrentStep("trending");
    setResults(prev => ({
      ...prev,
      trending: { ...prev.trending, status: "processing", content: "" },
      hating: { ...prev.hating, status: "pending", content: "" },
      viral: { ...prev.viral, status: "pending", content: "" },
      publishing: { ...prev.publishing, status: "pending", content: "" },
    }));

    try {
      // 1. Trend Spotter
      const trendResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Scrape and summarize the latest AI news and trends related to: ${topic}. Focus on what's actually happening right now.`,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const trendContent = trendResponse.text || "No trends found.";
      setResults(prev => ({
        ...prev,
        trending: { ...prev.trending, status: "success", content: trendContent }
      }));

      // 2. The Hater
      setCurrentStep("hating");
      setResults(prev => ({ ...prev, hating: { ...prev.hating, status: "processing" } }));
      const haterResponse = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: `Based on these AI trends: \n\n${trendContent}\n\nFind a contrarian, "hater" take. Why is this trend overhyped, dangerous, or fundamentally flawed? Be witty but critical.`,
      });
      const haterContent = haterResponse.text || "No hater take generated.";
      setResults(prev => ({
        ...prev,
        hating: { ...prev.hating, status: "success", content: haterContent }
      }));

      // 3. Viral Specialist
      setCurrentStep("viral");
      setResults(prev => ({ ...prev, viral: { ...prev.viral, status: "processing" } }));
      const viralResponse = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: `Combine the trend news and the contrarian take into a viral X (Twitter) thread. 
        Trend: ${trendContent}
        Contrarian Take: ${haterContent}
        
        Requirements:
        - 5-7 tweets
        - Hook that stops the scroll
        - Mix of data and spicy opinion
        - Strong call to action at the end
        - Use emojis sparingly but effectively`,
      });
      const viralContent = viralResponse.text || "No thread generated.";
      setResults(prev => ({
        ...prev,
        viral: { ...prev.viral, status: "success", content: viralContent }
      }));

      // 4. Publisher (Gmail Draft)
      if (isAuthenticated) {
        setCurrentStep("publishing");
        setResults(prev => ({ ...prev, publishing: { ...prev.publishing, status: "processing" } }));
        
        try {
          const draftRes = await fetch("/api/gmail/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subject: `Ghostwriter Swarm: ${topic} Analysis`,
              body: `Here is the viral thread analysis for "${topic}":\n\n${viralContent}\n\nOriginal Trend:\n${trendContent}\n\nContrarian Take:\n${haterContent}`
            })
          });

          const draftData = await draftRes.json();

          if (draftRes.ok) {
            setResults(prev => ({
              ...prev,
              publishing: { ...prev.publishing, status: "success", content: "Gmail draft created successfully! Check your 'Drafts' folder." }
            }));
          } else {
            throw new Error(draftData.error || "Failed to create Gmail draft");
          }
        } catch (err: any) {
          setResults(prev => ({
            ...prev,
            publishing: { ...prev.publishing, status: "error", error: err.message }
          }));
          throw err;
        }
      } else {
        setResults(prev => ({
          ...prev,
          publishing: { ...prev.publishing, status: "error", error: "Gmail not connected. Connect to publish." }
        }));
      }

      setCurrentStep("completed");
    } catch (error: any) {
      console.error("Workflow failed:", error);
      setCurrentStep("completed");
      // Mark current processing step as error
      setResults(prev => {
        const newResults = { ...prev };
        Object.keys(newResults).forEach(key => {
          if (newResults[key].status === "processing") {
            newResults[key] = { ...newResults[key], status: "error", error: error.message };
          }
        });
        return newResults;
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Ghostwriter Swarm</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {isInIframe && !isAuthenticated && (
              <button 
                onClick={() => window.open(window.location.href, '_blank')}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600/10 text-orange-500 border border-orange-600/20 rounded-full text-sm font-semibold hover:bg-orange-600/20 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Open in New Tab
              </button>
            )}
            {!isAuthenticated ? (
              <button 
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Connect Gmail
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-full text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  Gmail Connected
                </div>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs text-gray-500 hover:text-white transition-colors underline underline-offset-4"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero / Input Section */}
        <section className="mb-16 text-center max-w-3xl mx-auto">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black mb-6 tracking-tighter"
          >
            Agentic Content <span className="text-orange-600">Engine</span>
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-gray-400 text-lg mb-8"
          >
            Trigger a 4-step swarm of AI agents to turn any topic into a viral thread and a Gmail draft.
          </motion.p>

          <div className="relative group">
            <input 
              type="text" 
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a topic (e.g. AI Agents, Space Travel...)"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-5 text-xl focus:outline-none focus:ring-2 focus:ring-orange-600/50 transition-all placeholder:text-gray-600"
            />
            <button 
              onClick={runWorkflow}
              disabled={currentStep !== "idle" && currentStep !== "completed"}
              className="absolute right-3 top-3 bottom-3 px-8 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-xl font-bold flex items-center gap-2 transition-all"
            >
              {currentStep === "idle" || currentStep === "completed" ? (
                <>
                  Launch Swarm
                  <ArrowRight className="w-5 h-5" />
                </>
              ) : (
                <>
                  Swarming...
                  <Loader2 className="w-5 h-5 animate-spin" />
                </>
              )}
            </button>
          </div>
        </section>

        {/* Workflow Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Steps List */}
          <div className="space-y-4">
            <StepCard 
              icon={<TrendingUp className="w-5 h-5" />}
              title="Trend Spotter"
              description="Scraping AI news & latest trends"
              status={results.trending.status}
              error={results.trending.error}
              isActive={currentStep === "trending"}
            />
            <StepCard 
              icon={<Skull className="w-5 h-5" />}
              title="The Hater"
              description="Finding the contrarian perspective"
              status={results.hating.status}
              error={results.hating.error}
              isActive={currentStep === "hating"}
            />
            <StepCard 
              icon={<Twitter className="w-5 h-5" />}
              title="Viral Specialist"
              description="Crafting the perfect thread"
              status={results.viral.status}
              error={results.viral.error}
              isActive={currentStep === "viral"}
            />
            <StepCard 
              icon={<Send className="w-5 h-5" />}
              title="Publisher"
              description="Creating Gmail draft"
              status={results.publishing.status}
              error={results.publishing.error}
              isActive={currentStep === "publishing"}
            />
          </div>

          {/* Results Display */}
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-500" />
                Live Output
              </h3>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-12">
              <AnimatePresence mode="popLayout">
                {Object.entries(results).map(([key, result]) => (
                  result.content && (
                    <motion.div 
                      key={key}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-orange-500 font-mono text-xs uppercase tracking-widest">
                        <span className="w-8 h-px bg-orange-500/30" />
                        {result.title}
                      </div>
                      <div className="prose prose-invert prose-orange max-w-none">
                        <ReactMarkdown>{result.content}</ReactMarkdown>
                      </div>
                    </motion.div>
                  )
                ))}
                
                {currentStep === "idle" && (
                  <div className="h-full flex flex-col items-center justify-center text-gray-600 py-20">
                    <Zap className="w-12 h-12 mb-4 opacity-20" />
                    <p>Enter a topic and launch the swarm to see results.</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Zap className="w-4 h-4" />
            Ghostwriter Swarm © 2026
          </div>
          <div className="flex gap-8 text-gray-500 text-sm font-medium">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">API Status</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

// --- Sub-components ---

function StepCard({ 
  icon, 
  title, 
  description, 
  status, 
  error,
  isActive 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  status: StepResult["status"];
  error?: string;
  isActive: boolean;
}) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border transition-all duration-500",
      isActive ? "bg-orange-600/10 border-orange-600/50 scale-[1.02]" : "bg-white/5 border-white/10",
      status === "success" && "border-green-500/30",
      status === "error" && "border-red-500/30"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
          isActive ? "bg-orange-600 text-white" : "bg-white/5 text-gray-400",
          status === "success" && "bg-green-500/20 text-green-400",
          status === "error" && "bg-red-500/20 text-red-400"
        )}>
          {status === "processing" ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className={cn(
              "font-bold",
              isActive ? "text-white" : "text-gray-300"
            )}>{title}</h4>
            {status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {status === "error" && <AlertCircle className="w-4 h-4 text-red-500" />}
          </div>
          <p className="text-sm text-gray-500">{description}</p>
          {status === "error" && error && (
            <p className="text-xs text-red-400 mt-2 font-mono bg-red-500/10 p-2 rounded border border-red-500/20 break-all">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
