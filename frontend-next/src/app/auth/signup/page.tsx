
"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, Lock, User, Phone, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type SignupFormData = z.infer<typeof signupSchema>;

function Navbar() {
  return (
    <nav className="flex justify-between items-center px-8 py-2 shadow-sm bg-white/70 backdrop-blur-lg sticky top-0 z-50 transition-all duration-300">
      <div className="flex items-center gap-3">
        <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-10 w-10 object-contain rounded" style={{ boxShadow: "0 0 4px #e5e7eb" }} />
        <div className="flex flex-col">
          <span className="text-lg font-semibold text-red-700 leading-tight">नागरिक गुनासो व्यवस्थापन</span>
          <span className="text-sm text-blue-700">Citizen Grievance System</span>
        </div>
      </div>
      <div className="flex items-center gap-8 text-base">
        <a href="/" className="hover:text-red-600 font-medium transition">Home</a>
        <a href="#" className="hover:text-red-600 font-medium transition">About</a>
        <a href="/auth/login">
          <Button variant="outline" className="border border-gray-300 px-5 py-2 rounded-lg font-semibold text-gray-700 hover:text-red-600 hover:border-red-600 transition">Citizen Login</Button>
        </a>
        <Button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg font-semibold transition">Admin Portal</Button>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-[#003C88] text-white pt-16 pb-6 mt-16">
      <div className="text-center mb-12 px-4">
        <h2 className="text-lg font-medium mb-2">Ready to Make Your Voice Heard?</h2>
        <p className="text-gray-200 mb-6">Join thousands of citizens who are using this platform to improve their communities</p>
        <div className="flex justify-center">
          <a href="/auth/signup">
            <button className="bg-[#E8214A] hover:bg-[#c81940] text-white font-semibold px-8 py-3 rounded-md transition">Sign Up Now</button>
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 border-t border-gray-400/30 pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <img src="/nepal-flag.gif" alt="Nepal Flag" className="h-7 w-7 object-contain rounded shadow" />
            <h3 className="font-semibold text-lg">Citizen Grievance System</h3>
          </div>
          <p className="text-gray-200 text-sm leading-relaxed">A modern platform for citizens to voice their concerns and for local governance to respond efficiently.</p>
        </div>
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
      <div className="mt-10 border-t border-gray-400/20 pt-6 text-center text-sm text-gray-300">© 2025 Government of Nepal. All rights reserved.</div>
    </footer>
  );
}

export default function SignupPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  });
  const password = watch("password", "");
  // Password strength calculator
  const getPasswordStrength = () => {
    if (!password) return { score: 0, text: "", color: "" };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score, text: "Weak", color: "bg-red-500" };
    if (score <= 4) return { score, text: "Medium", color: "bg-yellow-500" };
    return { score, text: "Strong", color: "bg-green-500" };
  };
  const passwordStrength = getPasswordStrength();
  const onSubmit = async (data: SignupFormData) => {
    setError("");
    setLoading(true);
    try {
      await signup(data.name, data.email, data.phone, data.password);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || "Signup failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="font-inter min-h-screen bg-white">
      <Navbar />
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <div className="text-center mb-8">
          <img src="/nepal-flag.gif" alt="Nepal Flag" className="w-14 h-14 mx-auto mb-3" />
          <h1 className="text-xl font-semibold text-[#E8214A]">Citizen Portal</h1>
          <p className="text-gray-500 text-sm font-medium">नागरिक गुनासो व्यवस्थापन</p>
        </div>
        <div className="bg-white w-full max-w-md rounded-xl shadow-md p-8 border border-gray-100">
          <h2 className="text-lg font-semibold mb-1">Create Your Account</h2>
          <p className="text-gray-500 text-sm mb-5">Sign up to access the citizen dashboard</p>
          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input {...register("name")} type="text" id="name" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" placeholder="Ram Sharma" />
              </div>
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input {...register("email")} type="email" id="email" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" placeholder="ram@example.com" />
              </div>
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            {/* Phone Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input {...register("phone")} type="tel" id="phone" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" placeholder="+977-9841234567" />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
            </div>
            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input {...register("password")} type="password" id="password" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" placeholder="Create a strong password" />
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              {/* Password Strength Indicator */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded ${i <= passwordStrength.score ? passwordStrength.color : "bg-gray-200"}`} />
                    ))}
                  </div>
                  <p className={`text-xs ${passwordStrength.score <= 2 ? "text-red-600" : passwordStrength.score <= 4 ? "text-yellow-600" : "text-green-600"}`}>Password strength: {passwordStrength.text}</p>
                </div>
              )}
            </div>
            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                <input {...register("confirmPassword")} type="password" id="confirmPassword" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" placeholder="Confirm your password" />
              </div>
              {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
            </div>
            {/* Submit Button */}
            <button type="submit" disabled={loading} className="w-full bg-[#E8214A] hover:bg-[#c81940] text-white py-2.5 rounded-md font-semibold transition mt-6">{loading ? (<div className="flex items-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div><span>Creating account...</span></div>) : "Create Account"}</button>
          </form>
          {/* Login Link */}
          <div className="mt-5 text-center">
            <p className="text-sm text-gray-600">Already have an account?{' '}<Link href="/auth/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">Sign in</Link></p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
