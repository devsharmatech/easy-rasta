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
                        <p className="text-white/70 text-sm leading-relaxed mb-4">
                            Your ultimate companion for tracking fuel prices, managing vehicle expenses, and connecting with fellow travelers.
                        </p>
                        <div className="space-y-2.5 mb-6">
                            <a href="tel:+919632380747" className="flex items-center gap-2.5 text-white/70 hover:text-[#F7AA29] transition-colors group w-fit">
                                <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-[#F7AA29]/20 flex items-center justify-center transition-colors">
                                    <Phone className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm font-medium">+91 9632380747</span>
                            </a>
                            <a href="tel:+919902966990" className="flex items-center gap-2.5 text-white/70 hover:text-[#F7AA29] transition-colors group w-fit">
                                <div className="w-8 h-8 rounded-lg bg-white/10 group-hover:bg-[#F7AA29]/20 flex items-center justify-center transition-colors">
                                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
                                    </svg>
                                </div>
                                <span className="text-sm font-medium">+91 9902966990</span>
                            </a>
                        </div>
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
                    <div className="text-center md:text-left">
                        <p className="text-white/50 text-sm">
                            &copy; {new Date().getFullYear()} Easy Rasta (DETOUR SERVICES INDIA PRIVATE LIMITED). All rights reserved.
                        </p>
                    </div>
                    <div className="flex items-center gap-6 text-white/50 text-sm">
                        <a href="mailto:devices@easyrasta.in" className="flex items-center gap-1.5 hover:text-[#F7AA29] transition-colors">
                            <Mail className="w-3.5 h-3.5" />
                            devices@easyrasta.in
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
}
