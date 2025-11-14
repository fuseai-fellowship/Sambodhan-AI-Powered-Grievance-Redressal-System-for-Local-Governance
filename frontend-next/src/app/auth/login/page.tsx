"use client";

import React, { useState } from "react";
import { Mail, Lock, User, Phone, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

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

export default function LoginPage() {
  return (
    <div className="font-inter min-h-screen bg-white">
      <Navbar />
      <AuthForm />
      <Footer />
    </div>
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


const loginSchema = z.object({
  email: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

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

function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center mb-8">
        <img src="/nepal-flag.gif" alt="Nepal Flag" className="w-14 h-14 mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-[#E8214A]">Citizen Portal</h1>
        <p className="text-gray-500 text-sm font-medium">नागरिक गुनासो व्यवस्थापन</p>
      </div>
      <div className="bg-white w-full max-w-md rounded-xl shadow-md p-8 border border-gray-100">
        <div className="flex mb-6 bg-gray-100 rounded-full p-1">
          <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Login</button>
          <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 rounded-full text-sm font-semibold transition ${!isLogin ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>Sign Up</button>
        </div>
        {isLogin ? <LoginForm /> : <SignupForm setIsLogin={setIsLogin} />}
      </div>
    </div>
  );
}

function LoginForm() {
  const { login } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });
  const onSubmit = async (data: { email: string; password: string }) => {
    setError("");
    setLoading(true);
    try {
      await login(data.email, data.password);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.data?.detail) {
        setError((err as any).response.data.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Email or Phone</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("email")} type="text" placeholder="Enter your email or phone" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("password")} type="password" placeholder="Enter your password" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
      </div>
      <div className="flex items-center justify-between mb-6">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" className="accent-[#E8214A] h-4 w-4" />
          Remember me
        </label>
        <a href="#" className="text-[#E8214A] text-sm hover:underline">Forgot password?</a>
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <button type="submit" className="w-full bg-[#E8214A] hover:bg-[#c81940] text-white py-2.5 rounded-md font-semibold transition" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
    </form>
  );
}

function SignupForm({ setIsLogin }: { setIsLogin: (login: boolean) => void }) {
  const { signup } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ resolver: zodResolver(signupSchema) });
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
  const onSubmit = async (data: { name: string; email: string; phone: string; password: string; confirmPassword: string }) => {
    setError("");
    setLoading(true);
    try {
      await signup(data.name, data.email, data.phone, data.password);
    } catch (err) {
      if (typeof err === 'object' && err !== null && 'response' in err && (err as any).response?.data?.detail) {
        setError((err as any).response.data.detail);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Full Name</label>
        <div className="relative">
          <User className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("name")} type="text" placeholder="Your Name" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("email")} type="email" placeholder="your@email.com" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Phone Number</label>
        <div className="relative">
          <Phone className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("phone")} type="tel" placeholder="+977-98XXXXXXXX" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>}
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("password")} type="password" placeholder="Create a strong password" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
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
      <div className="mb-4">
        <label className="block text-sm font-semibold mb-1">Confirm Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
          <input {...register("confirmPassword")} type="password" placeholder="Confirm your password" className="w-full pl-10 pr-4 py-2.5 rounded-md bg-gray-100 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E8214A] text-sm" />
        </div>
        {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
      </div>
      {error && <div className="mb-4 text-sm text-red-600">{error}</div>}
      <button type="submit" className="w-full bg-[#E8214A] hover:bg-[#c81940] text-white py-2.5 rounded-md font-semibold transition" disabled={loading}>{loading ? "Creating account..." : "Sign Up"}</button>
      <div className="mt-4 text-center">
        <button type="button" className="text-[#E8214A] text-sm hover:underline" onClick={() => setIsLogin(true)}>Already have an account? Login</button>
      </div>
    </form>
  );
}
