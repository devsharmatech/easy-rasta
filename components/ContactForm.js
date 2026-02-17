'use client';

import { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import Button from './Button';

export default function ContactForm() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await fetch('/api/contact-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setStatus({ type: 'success', message: 'Message sent successfully! We will get back to you soon.' });
                setFormData({ name: '', email: '', subject: '', message: '' });
                setSubmitted(true);
            } else {
                setStatus({ type: 'error', message: data.error || 'Something went wrong. Please try again.' });
            }
        } catch (error) {
            setStatus({ type: 'error', message: 'Failed to send message. Please try again later.' });
        } finally {
            setLoading(false);
        }
    };

    // Beautiful success state
    if (submitted) {
        return (
            <div className="text-center py-12 px-4">
                <div className="relative inline-flex items-center justify-center mb-6">
                    <div className="absolute inset-0 w-24 h-24 bg-green-400/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                        <CheckCircle className="w-12 h-12 text-white" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-[#333333] mb-3">
                    Thank You! 🎉
                </h3>
                <p className="text-[#666666] text-lg mb-2 max-w-md mx-auto">
                    Your message has been sent successfully.
                </p>
                <p className="text-[#999999] text-sm mb-8">
                    We'll get back to you within 24 hours.
                </p>
                <button
                    onClick={() => { setSubmitted(false); setStatus({ type: '', message: '' }); }}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#FF7A00] text-white rounded-xl font-medium hover:bg-[#E56E00] transition-all duration-300 hover:shadow-lg hover:shadow-orange-200 active:scale-95"
                >
                    <Send className="w-4 h-4" />
                    Send Another Message
                </button>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                    <label htmlFor="name" className="block text-sm font-semibold text-[#333333] mb-2 group-focus-within:text-[#FF7A00] transition-colors">
                        Your Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] outline-none transition-all duration-300 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                        placeholder="John Doe"
                    />
                </div>
                <div className="group">
                    <label htmlFor="email" className="block text-sm font-semibold text-[#333333] mb-2 group-focus-within:text-[#FF7A00] transition-colors">
                        Email Address
                    </label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] outline-none transition-all duration-300 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                        placeholder="john@example.com"
                    />
                </div>
            </div>

            <div className="group">
                <label htmlFor="subject" className="block text-sm font-semibold text-[#333333] mb-2 group-focus-within:text-[#FF7A00] transition-colors">
                    Subject
                </label>
                <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] outline-none transition-all duration-300 bg-gray-50/50 hover:bg-white hover:border-gray-300"
                    placeholder="How can we help?"
                />
            </div>

            <div className="group">
                <label htmlFor="message" className="block text-sm font-semibold text-[#333333] mb-2 group-focus-within:text-[#FF7A00] transition-colors">
                    Message
                </label>
                <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00] outline-none transition-all duration-300 resize-none bg-gray-50/50 hover:bg-white hover:border-gray-300"
                    placeholder="Tell us more about your inquiry..."
                />
            </div>

            {status.message && (
                <div className={`flex items-start gap-3 p-4 rounded-xl border-l-4 transition-all duration-300 animate-in slide-in-from-top-2 ${status.type === 'success'
                        ? 'bg-green-50 border-l-green-500 text-green-800'
                        : 'bg-red-50 border-l-red-500 text-red-800'
                    }`}>
                    <div className={`mt-0.5 p-1 rounded-full ${status.type === 'success' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                        {status.type === 'success' ? (
                            <CheckCircle className="w-4 h-4" />
                        ) : (
                            <AlertCircle className="w-4 h-4" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-sm">{status.type === 'success' ? 'Success!' : 'Oops!'}</p>
                        <p className="text-sm opacity-80">{status.message}</p>
                    </div>
                </div>
            )}

            <Button type="submit" disabled={loading} className="w-full md:w-auto group">
                {loading ? (
                    <span className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                    </span>
                ) : (
                    <>
                        <Send className="w-5 h-5 mr-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform duration-300" />
                        Send Message
                    </>
                )}
            </Button>
        </form>
    );
}
