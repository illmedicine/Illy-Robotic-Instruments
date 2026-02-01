export default function IllySocialPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      {/* Meta redirect */}
      <head>
        <meta httpEquiv="refresh" content="0; url=https://illmedicine.github.io/illysocialV2/" />
      </head>
      
      {/* Redirect Script */}
      <script dangerouslySetInnerHTML={{
        __html: `window.location.replace('https://illmedicine.github.io/illysocialV2/');`
      }} />

      {/* Hero Section - Fallback content while redirecting */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl"></div>
          <div className="absolute -bottom-40 right-1/3 h-[520px] w-[760px] translate-x-1/2 rounded-full bg-pink-500/10 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-slate-400 hover:text-white">Home</a>
            <span className="text-slate-600">/</span>
            <a href="/#products" className="text-slate-400 hover:text-white">Products</a>
            <span className="text-slate-600">/</span>
            <span className="text-violet-400">Illy Social</span>
          </div>

          <div className="mt-8 grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1 text-xs text-violet-300 ring-1 ring-violet-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse"></span>
                Launching Platform...
              </div>

              <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                Illy Social
              </h1>
              
              <p className="mt-4 text-xl text-violet-400 font-semibold">
                Redirecting to Platform
              </p>

              <p className="mt-6 text-lg leading-relaxed text-slate-200">
                You are being redirected to the Illy Social platform. If you are not redirected automatically, 
                click the button below.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a 
                  href="https://illmedicine.github.io/illysocialV2/" 
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95 transition-all"
                >
                  Launch Platform Manually
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="#contact" 
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-all"
                >
                  Request Demo
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 p-1 ring-1 ring-violet-500/30">
                <div className="rounded-3xl bg-ink-900 p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Active Communities</div>
                        <div className="text-2xl font-bold text-white">18,500+</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/20 ring-1 ring-pink-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Monthly Transactions</div>
                        <div className="text-2xl font-bold text-white">$8.2M</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Data Sovereignty Rate</div>
                        <div className="text-2xl font-bold text-white">100%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Differentiators */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Beyond Traditional Social Platforms
          </h2>
          <p className="mt-3 text-slate-200">
            Own your audience, own your data, own your revenue
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">Complete Data Ownership</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              You own 100% of your user data. No platform extraction, no hidden analytics sales. 
              Your audience data belongs to you, stored in your sovereign vault.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/20 ring-1 ring-pink-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">Direct Monetization</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Sell products, services, subscriptions, and digital goods directly to your community. 
              No platform fees, no algorithmic suppression—just direct commerce.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">Multi-Channel Presence</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Manage all your social channels from one dashboard. Cross-post, analyze engagement, 
              and build audiences across platforms while maintaining sovereignty.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">Advanced Analytics</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Deep insights into audience behavior, content performance, and revenue attribution. 
              AI-powered recommendations help optimize your growth strategy.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-pink-500/20 ring-1 ring-pink-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">Community Building</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Built-in tools for community management, exclusive membership tiers, private forums, 
              and direct messaging—all within your sovereign ecosystem.
            </p>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mt-4 text-xl font-semibold">AI-Powered Content</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Leverage ethical AI to optimize content creation, automate responses, and personalize 
              experiences—while maintaining human oversight and transparency.
            </p>
          </div>
        </div>
      </section>

      {/* Platform Features */}
      <section className="border-y border-white/10 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Everything You Need to Build & Scale
            </h2>
            <p className="mt-3 text-slate-200">
              A complete toolkit for modern creator economies
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 ring-1 ring-white/10">
              <h3 className="text-xl font-semibold">E-Commerce Suite</h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Full product catalog with variants, inventory management, and automated fulfillment</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Digital product delivery with secure downloads and license key generation</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Subscription management with recurring billing and automated renewal</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Integrated payment processing with Stripe, PayPal, and cryptocurrency</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 ring-1 ring-white/10">
              <h3 className="text-xl font-semibold">Social Tools</h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Cross-platform posting to Facebook, Instagram, Twitter, LinkedIn, TikTok</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Content calendar with scheduling, drafts, and collaborative workflows</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Engagement tracking with unified inbox for comments, DMs, and mentions</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-pink-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Hashtag research and optimization tools for maximum reach</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 ring-1 ring-white/10">
              <h3 className="text-xl font-semibold">Community Management</h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Private forums and discussion boards with moderation tools</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Tiered membership access with exclusive content and perks</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Live streaming with chat, Q&A, and audience interaction</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-cyan-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Email marketing with segmentation, automation, and CRM integration</span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-8 ring-1 ring-white/10">
              <h3 className="text-xl font-semibold">Data & Security</h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Personal data vault with encryption and sovereign storage</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Zero-knowledge architecture ensuring privacy by design</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">GDPR and CCPA compliance with user consent management</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-violet-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-slate-200">Data portability allowing seamless migration to any platform</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Built for Every Creator Type
          </h2>
          <p className="mt-3 text-slate-200">
            From solopreneurs to enterprises
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Influencers & Creators</h3>
            <p className="mt-2 text-sm text-slate-200">
              Build your brand across all channels while maintaining full data ownership and monetization control.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">E-Commerce Brands</h3>
            <p className="mt-2 text-sm text-slate-200">
              Launch social commerce storefronts with integrated inventory, fulfillment, and customer management.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Course Creators</h3>
            <p className="mt-2 text-sm text-slate-200">
              Host courses, manage students, and deliver content through your own sovereign platform.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Agencies & Teams</h3>
            <p className="mt-2 text-sm text-slate-200">
              Manage multiple client accounts with team collaboration, white-label options, and unified reporting.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Community Leaders</h3>
            <p className="mt-2 text-sm text-slate-200">
              Build engaged communities with exclusive content, events, and member-only benefits.
            </p>
          </div>

          <div className="rounded-3xl bg-gradient-to-br from-white/5 to-white/[0.02] p-6 ring-1 ring-white/10">
            <h3 className="text-lg font-semibold">Enterprise Brands</h3>
            <p className="mt-2 text-sm text-slate-200">
              Deploy at scale with SSO, advanced permissions, compliance tools, and dedicated support.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="border-t border-white/10 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Ready to Own Your Creator Economy?
            </h2>
            <p className="mt-3 text-slate-200">
              Join thousands of creators building sustainable businesses with complete data sovereignty
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a 
                href="https://illmedicine.github.io/illysocialV2/" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 px-8 py-4 text-base font-semibold text-white shadow-glow hover:opacity-95 transition-all"
              >
                Start Building Now
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a 
                href="mailto:hello@illyrobotics.com?subject=Illy%20Social%20Enterprise%20Demo%20Request"
                className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-8 py-4 text-base font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-all"
              >
                Request Enterprise Demo
              </a>
            </div>
          </div>

          <div className="mt-12 text-center">
            <a href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
              ← Back to Home
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
