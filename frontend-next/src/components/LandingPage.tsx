import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
  <div className="font-inter min-h-screen bg-white">
      {/* Navbar */}
  <nav className="flex justify-between items-center px-8 py-2 shadow-sm bg-white/70 backdrop-blur-lg sticky top-0 z-50 transition-all duration-300">
        <div className="flex items-center gap-3">
          <img
            src="/nepal-flag.gif"
            alt="Nepal Flag"
            className="h-10 w-10 object-contain rounded"
            style={{ boxShadow: "0 0 4px #e5e7eb" }}
          />
          <div className="flex flex-col">
            <span className="text-lg font-semibold text-red-700 leading-tight">
              नागरिक गुनासो व्यवस्थापन
            </span>
            <span className="text-sm text-blue-700">Citizen Grievance System</span>
          </div>
        </div>
        <div className="flex items-center gap-8 text-base">
          <a href="#" className="hover:text-red-600 font-medium transition">Home</a>
          <a href="#" className="hover:text-red-600 font-medium transition">About</a>
          <a href="/auth/login">
            <Button variant="outline" className="border border-gray-300 px-5 py-2 rounded-lg font-semibold text-gray-700 hover:text-red-600 hover:border-red-600 transition">Citizen Login</Button>
          </a>
          <Button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition">Admin Portal</Button>
        </div>
      </nav>

      {/* Hero Section */}
  <section className="relative flex flex-row items-center justify-between bg-linear-to-br from-red-600 to-red-700 text-white px-16 py-20 min-h-[400px]">
  <div className="flex-1 flex flex-col justify-center items-start text-left pl-0 md:pl-0">
          <h1 className="text-xl md:text-2xl font-bold mb-5 leading-tight">
            नागरिक गुनासो व्यवस्थापन प्रणाली
          </h1>
          <h2 className="text-base md:text-lg font-semibold mb-5">Citizen Grievance Management System</h2>
          <p className="text-sm mb-10 opacity-90 max-w-xl">
            Empowering citizens to voice their concerns. Local governance responds efficiently with a transparent and accountable system for better community service.
          </p>
          <div className="flex gap-4 mt-2">
            <a href="/auth/login">
              <Button className="bg-white text-[#D1153E] border-2 border-[#D1153E] font-semibold px-5 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 hover:bg-[#D1153E] hover:text-white hover:scale-105 hover:shadow-xl">
                <span className="font-semibold">Citizen Login</span>
                <span className="text-sm">→</span>
              </Button>
            </a>
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <img
            src="/nepal-flag.gif"
            alt="Nepal Flag Large"
            className="w-64 h-64 object-contain drop-shadow-xl"
          />
        </div>
  {/* Straight lower border for hero section */}
  <div className="absolute bottom-0 left-0 w-full h-2 bg-hero-border z-20"></div>
      </section>

  {/* Key Features Section - Updated UI */}
  <section className="w-full py-10 flex flex-col items-center text-center px-4 mb-8 mt-9">
        <h2 className="text-[#E8214A] font-medium text-lg mb-2">Key Features</h2>
        <p className="text-gray-600 max-w-3xl mb-8 text-base">
          A comprehensive platform designed to bridge the gap between citizens and local governance
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl">
          {[
            {
              icon: "📝",
              title: "Easy Registration",
              description: "Submit grievances quickly with our user-friendly form",
              borderColor: "border-t-[#E8214A]",
            },
            {
              icon: "📈",
              title: "Real-time Tracking",
              description: "Monitor the status and progress of your complaints",
              borderColor: "border-t-[#002F6C]",
            },
            {
              icon: "📨",
              title: "Direct Communication",
              description: "Receive updates and messages from administrators",
              borderColor: "border-t-[#E6B600]",
            },
            {
              icon: "🛡️",
              title: "Secure & Transparent",
              description: "Your data is protected and processes are transparent",
              borderColor: "border-t-[#E8214A]",
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className={`bg-white shadow-sm rounded-lg border border-gray-200 border-t-4 ${feature.borderColor} p-6 text-left hover:shadow-md transition-shadow`}
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-semibold text-gray-900 text-lg mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50 text-center">
  <h3 className="text-lg text-red-600 font-semibold mb-2">How It Works</h3>
  <p className="text-gray-600 mb-10 text-sm">
          Simple steps to get your grievances addressed
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-10 max-w-4xl mx-auto">
          {[
            {
              num: "1",
              title: "Register",
              desc: "Create your account and verify your identity",
            },
            {
              num: "2",
              title: "Submit Grievance",
              desc: "Fill out the form with details and attachments",
            },
            {
              num: "3",
              title: "Track & Resolve",
              desc: "Monitor progress and receive resolution updates",
            },
          ].map((step, i) => (
            <div key={i} className="text-center">
              <div
                className={`inline-flex items-center justify-center h-14 w-14 rounded-full mb-3 ${
                  i === 0
                    ? "bg-red-600 text-white"
                    : i === 1
                    ? "bg-blue-600 text-white"
                    : "bg-yellow-500 text-white"
                }`}
              >
                <span className="text-base font-bold">{step.num}</span>
              </div>
              <h4 className="font-semibold mb-1">{step.title}</h4>
              <p className="text-sm text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA + Footer Section - Refactored to match provided design */}
      <footer className="bg-[#003C88] text-white pt-16 pb-6 mt-16">
        {/* Call To Action */}
        <div className="text-center mb-12 px-4">
          <h2 className="text-lg font-medium mb-2">Ready to Make Your Voice Heard?</h2>
          <p className="text-gray-200 mb-6">Join thousands of citizens who are using this platform to improve their communities</p>
          <div className="flex justify-center">
            <a href="/auth/signup">
              <button className="bg-[#E8214A] hover:bg-[#c81940] text-white font-semibold px-8 py-3 rounded-md transition">Sign Up Now</button>
            </a>
          </div>
        </div>

        {/* Footer Content */}
        <div className="max-w-7xl mx-auto px-6 border-t border-gray-400/30 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left: Logo + About */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-7 w-7 object-contain rounded shadow" />
              <h3 className="font-semibold text-lg">Citizen Grievance System</h3>
            </div>
            <p className="text-gray-200 text-sm leading-relaxed">A modern platform for citizens to voice their concerns and for local governance to respond efficiently.</p>
          </div>
          {/* Center: Contact Info */}
          <div className="md:ml-20">
            <h4 className="font-semibold text-lg mb-3">Contact Information</h4>
            <ul className="space-y-2 text-sm text-gray-200">
                <li>
                  <span className="inline-block align-middle mr-1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                      <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.11-.21c1.21.49 2.53.76 3.88.76a1 1 0 011 1v3.5a1 1 0 01-1 1C10.07 22 2 13.93 2 4.5a1 1 0 011-1H6.5a1 1 0 011 1c0 1.35.27 2.67.76 3.88a1 1 0 01-.21 1.11l-2.2 2.2z" />
                    </svg>
                  </span>
                  +977-1-XXXXXXX
                </li>
              <li>
                <span className="inline-block align-middle mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18">
                    <rect width="512" height="512" rx="80" fill="#ECEFF1"/>
                    <polygon points="256,296 32,144 32,432 480,432 480,144" fill="#D32F2F"/>
                    <polygon points="256,296 32,144 256,296 480,144" fill="#F44336"/>
                    <polygon points="256,296 32,432 256,296 480,432" fill="#FFFFFF"/>
                  </svg>
                </span>
                info@grievance.gov.np
              </li>
              <li>
                <span className="inline-block align-middle mr-1">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="18" height="18">
                    <circle cx="256" cy="256" r="256" fill="#D2A4BC"/>
                    <circle cx="256" cy="342" r="80" fill="#E6E6E6" stroke="#222" strokeWidth="8"/>
                    <path d="M256 352c-44-80-80-144-80-184a80 80 0 01160 0c0 40-36 104-80 184z" fill="#F44336" stroke="#222" strokeWidth="8"/>
                    <circle cx="256" cy="172" r="32" fill="#FFF" stroke="#222" strokeWidth="8"/>
                    <circle cx="256" cy="172" r="16" fill="#F44336" stroke="#222" strokeWidth="8"/>
                  </svg>
                </span>
                Kathmandu, Nepal
              </li>
            </ul>
          </div>
          {/* Right: Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-200">
              <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              <li><a href="#" className="hover:text-white">Help & Support</a></li>
              <li><a href="#" className="hover:text-white">Accessibility</a></li>
            </ul>
          </div>
        </div>

        {/* Bottom Note */}
        <div className="mt-10 border-t border-gray-400/20 pt-6 text-center text-sm text-gray-300">
          © 2025 Government of Nepal. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
