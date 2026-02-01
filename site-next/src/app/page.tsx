"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("products");

  const products = [
    {
      id: "illysocial",
      name: "IllySocial",
      description: "Human-centered social economics platform for building community wealth and data sovereignty",
      icon: "🌐",
      url: "https://illmedicine.github.io/illysocialV2/",
      features: ["Community Building", "Data Sovereignty", "Wealth Distribution", "Social Economics"],
      color: "from-blue-600 to-cyan-500",
    },
    {
      id: "livepay",
      name: "LivePay",
      description: "Real-time payment and financial services for the modern economy",
      icon: "💳",
      url: "https://illmedicine.github.io/LivePay/",
      features: ["Instant Transfers", "Low Fees", "Global Reach", "24/7 Availability"],
      color: "from-violet-600 to-purple-500",
    },
    {
      id: "discryptobank",
      name: "DisCryptoBank",
      description: "Decentralized cryptocurrency banking infrastructure for financial freedom",
      icon: "🏦",
      url: "https://illmedicine.github.io/DisCryptoBankWebSite/",
      features: ["Decentralized", "Cryptocurrency", "Smart Banking", "DeFi Integration"],
      color: "from-orange-600 to-red-500",
    },
    {
      id: "petition",
      name: "Fair Credit Act Petition",
      description: "Support fair credit practices and financial equity through collaborative advocacy",
      icon: "⚖️",
      url: "https://illmedicine.github.io/LivePay-Petition-Suppot/#top",
      features: ["Fair Lending", "Financial Equity", "Consumer Rights", "Policy Advocacy"],
      color: "from-green-600 to-emerald-500",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-cyan-400/20 to-violet-500/20 ring-1 ring-white/10">
                <span className="text-lg font-bold text-cyan-400">🤖</span>
              </div>
              <div>
                <div className="text-sm font-bold text-white">Illy Robotic</div>
                <div className="text-xs text-slate-400">Enterprise Platform</div>
              </div>
            </div>

            <a
              href="#contact"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2 text-sm font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Get Started
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-16 sm:py-24 lg:py-32">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 right-0 h-80 w-80 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 blur-3xl"></div>
          <div className="absolute -bottom-40 left-0 h-80 w-80 rounded-full bg-gradient-to-br from-violet-500/10 to-purple-500/10 blur-3xl"></div>
        </div>

        <div className="relative mx-auto max-w-7xl text-center">
          <h1 className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl">
            Next-Generation Financial
            <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              {" "}
              Infrastructure
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Build on the future of fintech. Open-source, decentralized, and built for everyone.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => setActiveTab("products")}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Explore Products
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className="rounded-lg border border-white/20 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-all"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="px-4 py-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap justify-center gap-2 border-b border-white/10 pb-4">
            {[
              { id: "products", label: "Products", icon: "🚀" },
              { id: "features", label: "Features", icon: "✨" },
              { id: "about", label: "About", icon: "ℹ️" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-cyan-500/20 to-violet-500/20 text-white ring-1 ring-cyan-500/50"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Tab */}
      {activeTab === "products" && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-white">Our Products</h2>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 transition-all hover:border-white/20 hover:shadow-2xl hover:shadow-cyan-500/20"
                >
                  {/* Background gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${product.color} opacity-0 transition-opacity group-hover:opacity-10`}></div>

                  {/* Icon */}
                  <div className="relative mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-white/5 text-2xl group-hover:from-white/20 group-hover:to-white/10 transition-all">
                    {product.icon}
                  </div>

                  {/* Content */}
                  <h3 className="relative mb-2 text-xl font-bold text-white">{product.name}</h3>
                  <p className="relative mb-6 text-sm text-slate-300">{product.description}</p>

                  {/* Features */}
                  <div className="relative mb-6 space-y-2">
                    {product.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400"></span>
                        {feature}
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="relative flex items-center gap-2 text-sm font-semibold text-cyan-400 group-hover:text-cyan-300">
                    Launch Product
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-12 text-center text-3xl font-bold text-white">Enterprise Features</h2>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Open Source",
                  description: "Transparent, auditable, and community-driven development",
                  icon: "🔓",
                },
                {
                  title: "Decentralized",
                  description: "No single point of failure. Distributed architecture.",
                  icon: "🌍",
                },
                {
                  title: "Scalable",
                  description: "Built to grow with your business needs",
                  icon: "📈",
                },
                {
                  title: "Secure",
                  description: "Enterprise-grade security and compliance",
                  icon: "🔒",
                },
                {
                  title: "Fast",
                  description: "Lightning-quick transactions and real-time updates",
                  icon: "⚡",
                },
                {
                  title: "User-Friendly",
                  description: "Intuitive interfaces designed for everyone",
                  icon: "😊",
                },
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-6 hover:border-white/20 transition-all"
                >
                  <div className="mb-4 text-3xl">{feature.icon}</div>
                  <h3 className="mb-2 text-lg font-bold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-300">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* About Tab */}
      {activeTab === "about" && (
        <section className="px-4 py-16">
          <div className="mx-auto max-w-7xl">
            <h2 className="mb-8 text-center text-3xl font-bold text-white">About Illy Robotic</h2>

            <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-8">
              <p className="mb-4 text-lg text-slate-300">
                Illy Robotic Instruments is building the future of financial technology with a focus on human-centered design and data sovereignty.
              </p>
              <p className="mb-4 text-lg text-slate-300">
                Our mission is to create open, decentralized financial infrastructure that empowers individuals and communities worldwide.
              </p>
              <p className="text-lg text-slate-300">
                Through products like IllySocial, LivePay, and DisCryptoBank, we're revolutionizing how people interact with money and data.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="px-4 py-16">
        <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-gradient-to-r from-cyan-500/10 to-violet-500/10 p-8 sm:p-12 text-center">
          <h2 className="mb-4 text-3xl font-bold text-white">Ready to Transform Finance?</h2>
          <p className="mb-8 text-lg text-slate-300">
            Join thousands of developers and businesses building the future
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="https://illmedicine.github.io/illysocialV2/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3 font-semibold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
            >
              Start Exploring
            </a>
            <a
              href="#contact"
              className="rounded-lg border border-white/20 px-8 py-3 font-semibold text-white hover:bg-white/10 transition-all"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-900/50 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 grid gap-8 md:grid-cols-4">
            <div>
              <h3 className="mb-4 font-bold text-white">Products</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="https://illmedicine.github.io/illysocialV2/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    IllySocial
                  </a>
                </li>
                <li>
                  <a href="https://illmedicine.github.io/LivePay/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    LivePay
                  </a>
                </li>
                <li>
                  <a href="https://illmedicine.github.io/DisCryptoBankWebSite/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    DisCryptoBank
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Advocacy</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="https://illmedicine.github.io/LivePay-Petition-Suppot/#top" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Fair Credit Act Petition
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Resources</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="/whitepaper" className="hover:text-white transition-colors">
                    Whitepaper
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 font-bold text-white">Company</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    About
                  </a>
                </li>
                <li>
                  <a href="#contact" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2026 Illy Robotic Instruments. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
