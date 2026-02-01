export default function DiscryptobankPage() {
  return (
    <div className="min-h-screen bg-ink-950 text-slate-100">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-40 left-1/2 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl"></div>
          <div className="absolute -bottom-40 right-1/3 h-[520px] w-[760px] translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-32">
          <div className="flex items-center gap-2 text-sm">
            <a href="/" className="text-slate-400 hover:text-white">Home</a>
            <span className="text-slate-600">/</span>
            <a href="/#products" className="text-slate-400 hover:text-white">Products</a>
            <span className="text-slate-600">/</span>
            <span className="text-cyan-400">Discryptobank</span>
          </div>

          <div className="mt-8 grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300 ring-1 ring-cyan-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                Active Platform
              </div>

              <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                DisCryptoBank
              </h1>
              
              <p className="mt-4 text-xl text-cyan-400 font-semibold">
                A Bank for Discord That Pays People for Real Work
              </p>

              <p className="mt-6 text-lg leading-relaxed text-slate-200">
                Discord-native payroll engine that creates paid microtasks, verifies proof with URL + screenshot, 
                and pays workers in SOL—automatically. Turn your community into an earning engine.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a 
                  href="https://discord.com/oauth2/authorize?client_id=1465938334017912973" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-glow hover:opacity-95 transition-all"
                >
                  Add to Discord
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
                <a 
                  href="#contact" 
                  className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-6 py-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-all"
                >
                  Enterprise Setup
                </a>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 p-1 ring-1 ring-cyan-500/30">
                <div className="rounded-3xl bg-ink-900 p-8">
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Setup Time</div>
                        <div className="text-2xl font-bold text-white">2 Minutes</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Typical Payout</div>
                        <div className="text-2xl font-bold text-white">$0.01-$1.00</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 ring-1 ring-violet-500/30">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-sm text-slate-400">Payment Network</div>
                        <div className="text-2xl font-bold text-white">Solana</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            How DisCryptoBank Works
          </h2>
          <p className="mt-3 text-slate-200">
            Simple proof-based pipeline that scales across Discord servers
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* Buyer Experience */}
          <div className="rounded-3xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/[0.02] p-8 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 ring-1 ring-cyan-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Buyer Experience (IllySocial)</h3>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">1</div>
                <div>
                  <div className="font-semibold text-white">Purchase engagement package</div>
                  <div className="mt-1 text-sm text-slate-200">Buy a defined amount of views/likes/comments/subs</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">2</div>
                <div>
                  <div className="font-semibold text-white">Track fulfillment progress</div>
                  <div className="mt-1 text-sm text-slate-200">See tasks generated, assigned, and pending completion</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-400">3</div>
                <div>
                  <div className="font-semibold text-white">View live proof as testimonials</div>
                  <div className="mt-1 text-sm text-slate-200">Approved proof screenshots post to IllySocial as social proof</div>
                </div>
              </div>
            </div>
          </div>

          {/* Worker Experience */}
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/[0.02] p-8 ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 ring-1 ring-emerald-500/30">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold">Worker Experience (Discord)</h3>
            </div>

            <div className="mt-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">1</div>
                <div>
                  <div className="font-semibold text-white">Claim a task</div>
                  <div className="mt-1 text-sm text-slate-200">Pick a task you want to complete from the task listings</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">2</div>
                <div>
                  <div className="font-semibold text-white">Submit proof (Verify)</div>
                  <div className="mt-1 text-sm text-slate-200">Upload screenshot + exact URL via modal prompt in Discord</div>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400">3</div>
                <div>
                  <div className="font-semibold text-white">Get paid in SOL</div>
                  <div className="mt-1 text-sm text-slate-200">Autonomous verification triggers payout to your wallet</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl bg-gradient-to-r from-white/5 to-white/[0.02] p-8 ring-1 ring-white/10">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="text-4xl font-bold text-cyan-400">450</div>
              <div className="mt-2 text-sm text-slate-300">Tasks Generated</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-400">300</div>
              <div className="mt-2 text-sm text-slate-300">Assigned Tasks</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-violet-400">150</div>
              <div className="mt-2 text-sm text-slate-300">Pending Completion</div>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-200">
            Real-time transparency: see work happening behind the scenes after purchasing engagement
          </p>
        </div>
      </section>

      {/* Setup Section */}
      <section className="border-y border-white/10 bg-ink-900/30">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Setup in 2 Minutes
            </h2>
            <p className="mt-3 text-slate-200">
              Two wallets. Smart routing. Safe by design.
            </p>
          </div>

          <div className="mt-12 grid gap-8 md:grid-cols-2">
            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-500/30">
                For Server Admins
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Set the server treasury (ONE TIME)</h3>
              <p className="mt-3 text-sm text-slate-200">
                Connect your server's treasury wallet. This is immutable for safety.
              </p>
              
              <div className="mt-6 rounded-2xl bg-ink-900/60 p-4 ring-1 ring-white/10">
                <code className="text-sm text-cyan-400">/wallet connect</code>
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Independent treasury per server
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Prevents accidental wallet swaps
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Funds all payouts for that guild
                </li>
              </ul>
            </div>

            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/30">
                For All Users
              </div>
              <h3 className="mt-6 text-2xl font-semibold">Set your personal receiving wallet</h3>
              <p className="mt-3 text-sm text-slate-200">
                One wallet works across all servers running DisCryptoBank.
              </p>
              
              <div className="mt-6 rounded-2xl bg-ink-900/60 p-4 ring-1 ring-white/10">
                <code className="text-sm text-violet-400">/user-wallet</code>
              </div>

              <ul className="mt-4 space-y-2">
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Payments route treasury → your wallet
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Guild validation (only members get paid)
                </li>
                <li className="flex items-center gap-2 text-sm text-slate-200">
                  <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Built for mass microtask payouts
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Command Dictionary */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Command Dictionary
          </h2>
          <p className="mt-3 text-slate-200">
            Everything DisCryptoBank can do—grouped by purpose
          </p>
        </div>

        <div className="mt-12 grid gap-6">
          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <h3 className="text-xl font-semibold text-cyan-400">Treasury & Wallets</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-cyan-400 ring-1 ring-white/10">/wallet connect</code>
                <span className="text-sm text-slate-200">Connect the server treasury (one-time, immutable)</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-cyan-400 ring-1 ring-white/10">/wallet balance</code>
                <span className="text-sm text-slate-200">View treasury balance (SOL + USD)</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-cyan-400 ring-1 ring-white/10">/wallet info</code>
                <span className="text-sm text-slate-200">Audit treasury configuration</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-cyan-400 ring-1 ring-white/10">/user-wallet</code>
                <span className="text-sm text-slate-200">Set your personal receiving wallet (works across all servers)</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <h3 className="text-xl font-semibold text-violet-400">Bulk Tasks</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-violet-400 ring-1 ring-white/10">/bulk-tasks create</code>
                <span className="text-sm text-slate-200">Create a paid engagement campaign (title, description, payout)</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-violet-400 ring-1 ring-white/10">/bulk-tasks list</code>
                <span className="text-sm text-slate-200">List available tasks for members</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-violet-400 ring-1 ring-white/10">/bulk-tasks claim</code>
                <span className="text-sm text-slate-200">Self-assign a task to complete</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <h3 className="text-xl font-semibold text-emerald-400">Proof & Verification</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-emerald-400 ring-1 ring-white/10">/submit-proof</code>
                <span className="text-sm text-slate-200">Submit screenshot + exact URL via modal</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-emerald-400 ring-1 ring-white/10">/approve-proof list</code>
                <span className="text-sm text-slate-200">View pending proof submissions (role-restricted)</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-emerald-400 ring-1 ring-white/10">/approve-proof approve</code>
                <span className="text-sm text-slate-200">Approve proof and trigger payout</span>
              </div>
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-emerald-400 ring-1 ring-white/10">/approve-proof reject</code>
                <span className="text-sm text-slate-200">Reject proof with a reason</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
            <h3 className="text-xl font-semibold text-pink-400">Direct Payments</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-3">
                <code className="flex-shrink-0 rounded-lg bg-ink-900 px-3 py-1.5 text-sm text-pink-400 ring-1 ring-white/10">/pay</code>
                <span className="text-sm text-slate-200">Pay a user in SOL or USD (auto conversion)</span>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-ink-900/60 p-4 ring-1 ring-white/10">
              <p className="text-xs font-semibold text-slate-300">Safety controls:</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>• Guild validation: only server members can be paid</li>
                <li>• Smart routing: treasury → user wallet</li>
                <li>• Immutable treasury: reduces admin mistakes</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t border-white/10 bg-ink-900/30">
        <div className="mx-auto max-w-4xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mt-12 space-y-6">
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">Is the server treasury changeable?</h3>
              <p className="mt-2 text-sm text-slate-200">
                Treasury setup is designed as a one-time configuration for safety. This prevents accidental misroutes.
              </p>
            </div>

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">Do users need to set a wallet on every server?</h3>
              <p className="mt-2 text-sm text-slate-200">
                No. /user-wallet sets a personal receiving wallet that works across all servers running DisCryptoBank.
              </p>
            </div>

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">How do buyers see progress after purchasing engagement?</h3>
              <p className="mt-2 text-sm text-slate-200">
                DisCryptoBank surfaces generated vs assigned vs pending completion—and approved proof screenshots can be displayed on IllySocial as live testimonials.
              </p>
            </div>

            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <h3 className="font-semibold text-white">What platforms does this support?</h3>
              <p className="mt-2 text-sm text-slate-200">
                DisCryptoBank operates in Discord and supports engagement tasks that point to external platforms (YouTube, Instagram, TikTok, etc.).
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="contact" className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              Add DisCryptoBank to Your Discord Server
            </h2>
            <p className="mt-3 text-slate-200">
              Turn your community into an earning engine: task payouts, proof verification, and SOL payments—automated
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
              <a 
                href="https://discord.com/oauth2/authorize?client_id=1465938334017912973" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-4 text-base font-semibold text-white shadow-glow hover:opacity-95 transition-all"
              >
                ✅ Invite DisCryptoBank
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a 
                href="https://illmedicine.github.io/DisCryptoBankWebSite/" 
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-2xl bg-white/5 px-8 py-4 text-base font-semibold ring-1 ring-white/10 hover:bg-white/10 transition-all"
              >
                📖 View Full Documentation
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
