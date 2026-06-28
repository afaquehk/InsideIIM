import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "InsideIIM AI Investment Research",
  description:
    "Live AI-driven company investment research using LangGraph, Google Gemini, Tavily news, and Alpha Vantage financial data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-page-bg text-page-fg">
        <header className="w-full border-b border-neutral-200 bg-white/60 backdrop-blur sticky top-0 z-40">
          <div className="mx-auto max-w-[1200px] px-6 py-4 flex items-center justify-between">
            <div className="text-xl font-semibold">InsideIIM</div>
            <nav className="space-x-6">
              <a href="/" className="text-sm hover:underline">
                Home
              </a>
              <a href="/dashboard" className="text-sm hover:underline">
                Research
              </a>
              <a href="#" className="text-sm hover:underline">
                Docs
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="w-full border-t border-neutral-200 bg-white/60 backdrop-blur">
          <div className="mx-auto max-w-[1200px] px-6 py-6 text-sm text-neutral-600">© {new Date().getFullYear()} InsideIIM</div>
        </footer>
      </body>
    </html>
  );
}
