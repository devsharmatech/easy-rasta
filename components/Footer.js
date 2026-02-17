'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowUpRight } from 'lucide-react';
import { NAV_LINKS, SOCIAL_LINKS, APP_LINKS } from '@/lib/constants';

export default function Footer() {
    const pathname = usePathname();

    // Hide marketing footer on all /admin routes
    if (pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <footer className="bg-[#2F777B] text-white relative overflow-hidden">
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#7ADCE3]/40 to-transparent" />
            <div className="absolute top-20 right-0 w-72 h-72 bg-[#7ADCE3]/5 rounded-full blur-3xl" />
            <div className="absolute bottom-10 left-0 w-48 h-48 bg-[#CE5612]/5 rounded-full blur-3xl" />

            <div className="container mx-auto px-4 py-16 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand Section */}
                    <div className="lg:col-span-1">
                        <div className="flex items-center space-x-2.5 mb-5">
                            <div className="w-10 h-10 bg-gradient-to-br from-[#CE5612] to-[#F7AA29] rounded-xl flex items-center justify-center">
                                <span className="text-white font-bold text-lg">ER</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight">Easy Rasta</span>
                        </div>
                        <p className="text-white/70 text-sm leading-relaxed mb-6">
                            Your ultimate companion for tracking fuel prices, managing vehicle expenses, and connecting with fellow travelers.
                        </p>
                        <div className="flex space-x-3">
                            {[
                                { href: SOCIAL_LINKS.facebook, Icon: Facebook },
                                { href: SOCIAL_LINKS.twitter, Icon: Twitter },
                                { href: SOCIAL_LINKS.instagram, Icon: Instagram },
                                { href: SOCIAL_LINKS.youtube, Icon: Youtube },
                            ].map(({ href, Icon }, i) => (
                                <a
                                    key={i}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-9 h-9 rounded-lg bg-white/10 hover:bg-[#F7AA29] flex items-center justify-center transition-all duration-300 hover:scale-110"
                                >
                                    <Icon className="w-4 h-4" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-[#7ADCE3]">Quick Links</h3>
                        <ul className="space-y-3">
                            {NAV_LINKS.map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="flex items-center gap-1 text-white/70 hover:text-[#F7AA29] transition-colors text-sm group"
                                    >
                                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-[#7ADCE3]">Legal</h3>
                        <ul className="space-y-3">
                            {[
                                { name: 'Privacy Policy', href: '/privacy-policy' },
                                { name: 'Terms & Conditions', href: '/terms-and-conditions' },
                                { name: 'Refund Policy', href: '/refund-policy' },
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        href={link.href}
                                        className="flex items-center gap-1 text-white/70 hover:text-[#F7AA29] transition-colors text-sm group"
                                    >
                                        <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Download App */}
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider mb-5 text-[#7ADCE3]">Download App</h3>
                        <div className="space-y-3">
                            <a
                                href={APP_LINKS.playStore}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-xl px-4 py-3 group"
                            >
                                <div className="w-8 h-8 text-white">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/60 uppercase tracking-wider">Get it on</div>
                                    <div className="font-semibold text-sm">Google Play</div>
                                </div>
                            </a>
                            <a
                                href={APP_LINKS.appStore}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center space-x-3 bg-white/10 hover:bg-white/15 transition-all duration-300 rounded-xl px-4 py-3 group"
                            >
                                <div className="w-8 h-8 text-white">
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-[10px] text-white/60 uppercase tracking-wider">Download on the</div>
                                    <div className="font-semibold text-sm">App Store</div>
                                </div>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-white/50 text-sm">
                        &copy; {new Date().getFullYear()} Easy Rasta. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-white/50 text-sm">
                        <a href="mailto:support@easyrasta.in" className="flex items-center gap-1.5 hover:text-[#F7AA29] transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                            support@easyrasta.in
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
