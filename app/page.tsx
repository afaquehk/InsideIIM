import Link from "next/link";

export default function Home() {
  return (
    <div>
      <section className="hero bg-page-bg">
        <div className="container hero-left">
          <p className="brand-small">INVESTMENT RESEARCH</p>
          <h1 className="hero-title">Research companies with live AI-driven analysis.</h1>
          <p className="hero-sub">Run a complete investment research workflow — news, financials, analyst scoring, and a final verdict — powered by your existing research backend.</p>

          <div className="hero-cta">
            <div className="search-hero-input" style={{maxWidth:720}}>
              <input className="search-input" placeholder="Enter company name (e.g. Tesla)" />
              <Link href="/dashboard"><button className="search-btn">Research</button></Link>
            </div>
          </div>
        </div>

        <div className="container hero-visual" style={{maxWidth:1200}}>
          <div className="device-mock">
            <div style={{textAlign:"center"}}>
              <div style={{fontSize:18,fontWeight:700}}>Live research preview</div>
              <div style={{marginTop:10,color:"rgba(255,255,255,0.8)"}}>Open the Research page to run live analyses.</div>
            </div>
          </div>
        </div>
      </section>

      <section className="container">
        <div className="feature-grid">
          <div className="feature-card">
            <h3 className="text-lg font-semibold">AI-driven insights</h3>
            <p className="mt-2 text-sm text-neutral-600">Analyst-style reasoning, scored breakdowns, and concise theses — generated live by the research graph.</p>
          </div>
          <div className="feature-card">
            <h3 className="text-lg font-semibold">Live data collection</h3>
            <p className="mt-2 text-sm text-neutral-600">News search and financial lookups run in parallel to build a complete dataset for analysis.</p>
          </div>
          <div className="feature-card">
            <h3 className="text-lg font-semibold">Streamed progress</h3>
            <p className="mt-2 text-sm text-neutral-600">See step-by-step progress while the system executes the research workflow.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
