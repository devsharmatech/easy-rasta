'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X, Download } from 'lucide-react';
import { NAV_LINKS } from '@/lib/constants';

export default function Header() {
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    // Hide marketing header on all /admin routes
    if (pathname.startsWith('/admin')) {
        return null;
    }

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled
                ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-black/5'
                : 'bg-white/80 backdrop-blur-sm'
            }`}>
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16 lg:h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2.5 group">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#CE5612] to-[#F7AA29] rounded-xl flex items-center justify-center shadow-md shadow-[#CE5612]/20 group-hover:shadow-lg group-hover:shadow-[#CE5612]/30 transition-all duration-300">
                            <span className="text-white font-bold text-lg">ER</span>
                        </div>
                        <span className="text-[#1a1a1a] font-bold text-xl tracking-tight">Easy Rasta</span>
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center space-x-1">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${pathname === link.href
                                        ? 'text-[#CE5612] bg-[#CE5612]/5'
                                        : 'text-[#444444] hover:text-[#CE5612] hover:bg-[#CE5612]/5'
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </nav>

                    {/* CTA Button */}
                    <div className="hidden lg:block">
                        <Link
                            href="#download"
                            className="inline-flex items-center gap-2 bg-[#CE5612] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#F7AA29] transition-all duration-300 shadow-md shadow-[#CE5612]/20 hover:shadow-lg hover:shadow-[#F7AA29]/20 active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Download App
                        </Link>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6 text-[#1a1a1a]" />
                        ) : (
                            <Menu className="w-6 h-6 text-[#1a1a1a]" />
                        )}
                    </button>
                </div>

                {/* Mobile Navigation */}
                <div className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? 'max-h-[400px] opacity-100 pb-6' : 'max-h-0 opacity-0'
                    }`}>
                    <nav className="pt-2 border-t border-gray-100">
                        {NAV_LINKS.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`block py-3 px-4 rounded-lg text-sm font-medium transition-colors ${pathname === link.href
                                        ? 'text-[#CE5612] bg-[#CE5612]/5'
                                        : 'text-[#444444] hover:text-[#CE5612] hover:bg-[#CE5612]/5'
                                    }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.name}
                            </Link>
                        ))}
                        <div className="mt-3 px-4">
                            <Link
                                href="#download"
                                className="flex items-center justify-center gap-2 bg-[#CE5612] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#F7AA29] transition-colors w-full"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                <Download className="w-4 h-4" />
                                Download App
                            </Link>
                        </div>
                    </nav>
                </div>
            </div>
        </header>
    );
}
