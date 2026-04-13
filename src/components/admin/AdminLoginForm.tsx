'use client';

import React, { useState } from 'react';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const AdminLoginForm = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1); // 1: Password, 2: OTP
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [isShaking, setIsShaking] = useState(false);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/login/send-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to verify credentials');
            }

            setStep(2);
        } catch (err: any) {
            triggerShake();
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            console.log("ADMIN_LOGIN_DEBUG: Attempting final sign in for:", email);
            
            // Use standard auth endpoint
            const result = await signIn('otp', {
                identifier: email,
                password: password,
                otp: otp,
                redirect: false,
            });

            console.log("ADMIN_LOGIN_DEBUG: signIn result:", result);

            if (result?.error) {
                console.error("ADMIN_LOGIN_DEBUG: signIn error:", result.error);
                throw new Error(result.error);
            }

            if (result?.ok) {
                console.log("ADMIN_LOGIN_DEBUG: signIn successful, redirecting to /admin");
                // Wait a moment for cookies to be set, then redirect
                setTimeout(() => {
                    router.push('/admin');
                }, 500);
            }
        } catch (err: any) {
            console.error("ADMIN_LOGIN_DEBUG: Caught error:", err);
            triggerShake();
            setError(err.message === "CredentialsSignin" ? "Invalid email, password, or code." : err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-md mx-auto">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-950/10">
                        <Lock className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin Portal</h1>
                    <p className="text-slate-500 mt-2 text-sm">
                        {step === 1
                            ? "Secure access for administrative personnel only."
                            : "Enter the code sent to your email."}
                    </p>
                </div>

                <form onSubmit={step === 1 ? handleSendOtp : handleFinalSignIn} className="space-y-6">
                    <AnimatePresence mode="wait">
                                {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-center gap-3 overflow-hidden"
                            >
                                <AlertCircle size={18} className="shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="space-y-4">
                        {step === 1 ? (
                            <>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em] ml-1">Email Address</label>
                                    <div className="relative group">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="admin@example.com"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em] ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-4 pl-12 pr-4 outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-400"
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="space-y-1.5 text-center">
                                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.22em]">Verification Code</label>
                                <div className="flex justify-center mt-2">
                                    <input
                                        type="text"
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value)}
                                        placeholder="000000"
                                        className="w-48 bg-slate-50 border border-slate-200 rounded-xl py-4 text-center text-2xl font-semibold tracking-[0.5em] outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-300"
                                        maxLength={6}
                                        required
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-slate-400 hover:text-slate-900 mt-4 transition-colors underline"
                                >
                                    Use a different account
                                </button>
                            </div>
                        )}
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                        transition={{ duration: 0.4 }}
                    disabled={isLoading}
                    type="submit"
                    className="w-full bg-slate-950 hover:bg-slate-900 text-white font-semibold py-4 rounded-xl shadow-lg shadow-slate-950/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                        {isLoading ? (
                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                {step === 1 ? "Verify Password" : "Confirm Login"}
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </motion.button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">
                        Authorized Access Only. All activities are logged.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLoginForm;
