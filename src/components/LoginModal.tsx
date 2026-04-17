// ... imports
import React, { useState, useEffect } from 'react';
import { X, ArrowLeft, Mail, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface LoginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ViewState = 'EMAIL' | 'OTP' | 'COMPLETE_PROFILE';

const MotionError = ({ message }: { message: string }) => (
    <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 mb-4"
    >
        <AlertCircle size={18} className="shrink-0" />
        <p className="text-sm font-medium leading-tight">{message}</p>
    </motion.div>
);

const LoginModal = ({ isOpen, onClose }: LoginModalProps) => {
    const router = useRouter();
    const [view, setView] = useState<ViewState>('EMAIL');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [isLoading, setIsLoading] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    // Profile Completion State
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Error state
    const [error, setError] = useState('');

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setView('EMAIL');
            setEmail('');
            setOtp(['', '', '', '', '', '']);
            setError('');
            setIsLoading(false);
            setIsShaking(false);
            setFirstName('');
            setLastName('');
            setTermsAccepted(false);
        }
    }, [isOpen]);

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                triggerShake();
                throw new Error('Please enter a valid email address');
            }

            const res = await fetch('/api/auth/otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: email, type: 'EMAIL' }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send OTP');
            }

            setView('OTP');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpChange = (index: number, value: string) => {
        if (value.length > 1) return;
        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value !== '' && index < 5) {
            const nextInput = document.getElementById(`otp-${index + 1}`);
            nextInput?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
            const prevInput = document.getElementById(`otp-${index - 1}`);
            prevInput?.focus();
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const otpValue = otp.join('');

        try {
            const res = await fetch('/api/auth/otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: email, otp: otpValue }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || 'Verification failed');
            }

            if (data.exists) {
                await loginUser(email, otpValue);
            } else {
                setView('COMPLETE_PROFILE');
            }

        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCompleteProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const otpValue = otp.join('');
        const fullName = `${firstName} ${lastName}`.trim();

        try {
            const res = await fetch('/api/auth/complete-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: email,
                    otp: otpValue,
                    name: fullName,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to create profile');
            }

            await loginUser(email, otpValue);

        } catch (err: any) {
            triggerShake();
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const loginUser = async (identifier: string, otpValue: string) => {
        const result = await signIn('otp', {
            identifier,
            otp: otpValue,
            redirect: false,
        });

        if (result?.error) {
            throw new Error(result.error);
        }

        onClose();
        router.refresh();
    };

    const renderEmailView = () => (
        <form onSubmit={handleSendOtp} className="space-y-4">
            <AnimatePresence mode="wait">
                {error && <MotionError message={error} key="email-error" />}
            </AnimatePresence>

            <motion.div
                animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="bg-gray-50 rounded-lg p-4 border border-transparent focus-within:border-black/10 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <Mail size={20} className="text-gray-400" />
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="bg-transparent w-full outline-none text-gray-900 text-sm placeholder:text-gray-400"
                        required
                    />
                </div>
            </motion.div>

            <button
                type="submit"
                disabled={isLoading || !email.includes('@')}
                className="w-full bg-[#f44786] hover:bg-[#d63a73] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-sm active:scale-[0.99] flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    'Continue with Email'
                )}
            </button>

            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-100"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-4 text-gray-400 font-medium">or</span>
                </div>
            </div>

            {/* Google */}
            <button
                type="button"
                onClick={() => signIn('google')}
                className="w-full flex items-center justify-center gap-3 border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
                <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
                Continue with Google
            </button>

            <p className="text-center text-xs text-gray-500 mt-4 px-4 leading-relaxed">
                By continuing, you agree to our <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
            </p>
        </form>
    );

    const renderOtpView = () => (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
            <AnimatePresence mode="wait">
                {error && <MotionError message={error} key="otp-error" />}
            </AnimatePresence>
            <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Enter the code sent to</p>
                <p className="font-medium text-gray-900">{email}</p>
            </div>

            <motion.div
                animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="flex justify-center gap-2 sm:gap-3"
            >
                {otp.map((digit, index) => (
                    <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl text-black font-semibold border border-gray-200 rounded-lg outline-none focus:border-black focus:ring-1 focus:ring-black transition-all bg-gray-50"
                    />
                ))}
            </motion.div>

            <button
                type="submit"
                disabled={isLoading || otp.some(d => !d)}
                className="w-full bg-[#f44786] hover:bg-[#d63a73] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-sm active:scale-[0.99] flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    'Verify'
                )}
            </button>
            <div className="text-center">
                <button type="button" onClick={() => setView('EMAIL')} className="text-sm text-gray-500 hover:text-black font-medium transition-colors">
                    Wrong email?
                </button>
            </div>
        </form>
    );

    const renderCompleteProfileView = () => (
        <form onSubmit={handleCompleteProfile} className="space-y-4">
            <AnimatePresence mode="wait">
                {error && <MotionError message={error} key="complete-error" />}
            </AnimatePresence>
            <div className="text-center mb-4">
                <h3 className="text-lg font-semibold">Finish signing up</h3>
                <p className="text-sm text-gray-500">We need a few more details to create your account.</p>
            </div>

            <motion.div
                animate={isShaking ? { x: [-4, 4, -4, 4, 0] } : {}}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="space-y-3"
            >
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                    <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        className="bg-transparent w-full outline-none text-gray-900 text-sm placeholder:text-gray-400 mb-3 border-b border-gray-200 pb-2"
                        required
                    />
                    <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="bg-transparent w-full outline-none text-gray-900 text-sm placeholder:text-gray-400"
                        required
                    />
                </div>
            </motion.div>

            <div className="text-xs text-gray-500 flex gap-2 items-start mt-4">
                <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1"
                />
                <label htmlFor="terms">I agree to the <span className="underline text-blue-600 cursor-pointer">Terms of Service</span> and <span className="underline text-blue-600 cursor-pointer">Privacy Policy</span>. By selecting Agree and Continue, I agree to the terms.</label>
            </div>

            <button
                type="submit"
                disabled={isLoading || !termsAccepted || !firstName || !lastName}
                className="w-full bg-[#f44786] hover:bg-[#d63a73] disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-xl transition-colors shadow-sm active:scale-[0.99] flex justify-center items-center"
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    'Agree and Continue'
                )}
            </button>
        </form>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        {/* Modal Container */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-md p-6 relative shadow-xl overflow-hidden"
                        >
                            {/* Header */}
                            <div className="flex justify-between items-center mb-6 relative z-10">
                                <div className="flex items-center gap-3">
                                    {(view === 'OTP' || view === 'COMPLETE_PROFILE') && (
                                        <button onClick={() => setView('EMAIL')} className="p-1 hover:bg-gray-100 rounded-full transition-colors -ml-1">
                                            <ArrowLeft size={20} className="text-gray-900" />
                                        </button>
                                    )}
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {view === 'OTP' ? 'Verification' : view === 'COMPLETE_PROFILE' ? 'Finish Signing Up' : 'Login / Sign Up'}
                                    </h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <X size={24} className="text-gray-500" />
                                </button>
                            </div>

                            <div className="border-b border-gray-100 mb-6"></div>

                            {/* Dynamic Content */}
                            <motion.div
                                key={view}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                {view === 'EMAIL' && renderEmailView()}
                                {view === 'OTP' && renderOtpView()}
                                {view === 'COMPLETE_PROFILE' && renderCompleteProfileView()}
                            </motion.div>

                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default LoginModal;
