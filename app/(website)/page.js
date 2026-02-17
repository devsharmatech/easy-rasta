import Link from 'next/link';
import { ArrowRight, Download, Smartphone, ChevronRight } from 'lucide-react';
import Button from '@/components/Button';
import FeatureCard from '@/components/FeatureCard';
import SectionTitle from '@/components/SectionTitle';
import StepCard from '@/components/StepCard';
import AppScreenCard from '@/components/AppScreenCard';
import InfographicSection from '@/components/InfographicSection';
import YouTubeSection from '@/components/YouTubeSection';
import { KEY_HIGHLIGHTS, HOW_IT_WORKS, TARGET_AUDIENCE, APP_LINKS, APP_SCREENS, INFOGRAPHIC_STEPS } from '@/lib/constants';

export default function HomePage() {
    return (
        <>
            {/* ==============================
                1. HERO SECTION
               ============================== */}
            <section className="relative min-h-screen flex items-center overflow-hidden pt-28 lg:pt-32">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#7ADCE3] via-[#4db8c0] to-[#2F777B]" />

                {/* Decorative shapes */}
                <div className="absolute top-20 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-20 right-10 w-80 h-80 bg-[#CE5612]/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />

                {/* Grid dots pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                    backgroundSize: '30px 30px',
                }} />

                <div className="container mx-auto px-6 md:px-10 lg:px-16 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                        {/* Text Content */}
                        <div className="text-center lg:text-left">
                            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white/90 text-sm px-4 py-2 rounded-full mb-6 border border-white/20">
                                <span className="w-2 h-2 bg-[#F7AA29] rounded-full animate-pulse" />
                                Now Available on Play Store & App Store
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                                Your Ultimate
                                <span className="block text-[#F7AA29]">Travel Companion</span>
                            </h1>
                            <p className="text-lg md:text-xl text-white/85 mb-8 max-w-lg mx-auto lg:mx-0 leading-relaxed">
                                Track fuel prices, manage vehicle expenses, join travel events, and earn XP while exploring new roads with Easy Rasta.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button href="#download" variant="primary" size="lg">
                                    <Download className="w-5 h-5 mr-2" />
                                    Download App
                                </Button>
                                <Button href="/features" variant="light" size="lg">
                                    Explore Features
                                    <ArrowRight className="w-5 h-5 ml-2" />
                                </Button>
                            </div>

                            {/* Stats */}
                            <div className="flex items-center gap-8 mt-10 justify-center lg:justify-start">
                                {[
                                    { value: '10K+', label: 'Downloads' },
                                    { value: '500+', label: 'Events' },
                                    { value: '4.8★', label: 'Rating' },
                                ].map((stat, i) => (
                                    <div key={i} className="text-center">
                                        <p className="text-2xl font-bold text-white">{stat.value}</p>
                                        <p className="text-xs text-white/60 uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Phone Mockups */}
                        <div className="flex justify-center lg:justify-end">
                            <div className="relative">
                                {/* Main Phone */}
                                <div className="w-64 h-[500px] bg-[#0f0f0f] rounded-[40px] shadow-2xl flex items-center justify-center border-4 border-[#333333] relative overflow-hidden">
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#0f0f0f] rounded-b-2xl z-10" />
                                    <div className="text-center p-6" style={{ background: 'linear-gradient(135deg, #CE561230, #F7AA2930)' }}>
                                        <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#CE5612] to-[#F7AA29] rounded-2xl flex items-center justify-center">
                                            <Smartphone className="w-10 h-10 text-white" />
                                        </div>
                                        <p className="text-white font-bold text-lg">Easy Rasta</p>
                                        <p className="text-white/50 text-sm mt-1">Your Travel Companion</p>
                                    </div>
                                </div>

                                {/* Secondary Phone */}
                                <div className="absolute -left-16 top-24 w-48 h-[380px] bg-[#0f0f0f] rounded-[32px] shadow-xl hidden lg:flex items-center justify-center border-4 border-[#333333] -rotate-6 overflow-hidden">
                                    <div className="text-center p-4" style={{ background: 'linear-gradient(135deg, #7ADCE320, #2F777B30)' }}>
                                        <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-[#7ADCE3] to-[#2F777B] rounded-xl flex items-center justify-center">
                                            <Smartphone className="w-7 h-7 text-white" />
                                        </div>
                                        <p className="text-white/70 text-sm font-medium">Fuel Prices</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom wave */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
                        <path d="M0 50L48 45.7C96 41.3 192 32.7 288 30C384 27.3 480 30.7 576 37.5C672 44.3 768 54.7 864 55.8C960 57 1056 49 1152 44.2C1248 39.3 1344 37.7 1392 36.8L1440 36V100H1392C1344 100 1248 100 1152 100C1056 100 960 100 864 100C768 100 672 100 576 100C480 100 384 100 288 100C192 100 96 100 48 100H0V50Z" fill="white" />
                    </svg>
                </div>
            </section>

            {/* ==============================
                2. APP SCREENS SECTION
               ============================== */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Explore the App"
                        subtitle="Take a sneak peek at the beautifully designed screens that make your travel experience seamless"
                    />
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 lg:gap-4">
                        {APP_SCREENS.map((screen, index) => (
                            <AppScreenCard
                                key={index}
                                index={index}
                                title={screen.title}
                                description={screen.description}
                                color={screen.color}
                                icon={screen.icon}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==============================
                3. FEATURES TILES SECTION
               ============================== */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Key Highlights"
                        subtitle="Discover the powerful features that make Easy Rasta your perfect travel companion"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {KEY_HIGHLIGHTS.map((highlight, index) => (
                            <FeatureCard
                                key={index}
                                title={highlight.title}
                                description={highlight.description}
                                icon={highlight.icon}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==============================
                4. HOW IT WORKS SECTION
               ============================== */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="How Easy Rasta Works"
                        subtitle="Get started in just 4 simple steps and transform your travel experience"
                    />
                    <div className="max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-8 items-stretch">
                            {HOW_IT_WORKS.map((step, index) => (
                                <StepCard
                                    key={index}
                                    step={step.step}
                                    title={step.title}
                                    description={step.description}
                                    icon={step.icon}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ==============================
                5. INFOGRAPHIC SECTION
               ============================== */}
            <section className="py-20 bg-gradient-to-br from-gray-50 to-[#E5C6AA]/20">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Your Journey with Easy Rasta"
                        subtitle="From download to daily use – here's your roadmap"
                    />
                    <InfographicSection steps={INFOGRAPHIC_STEPS} />
                </div>
            </section>

            {/* ==============================
                6. WHO IS IT FOR SECTION
               ============================== */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Who Is It For?"
                        subtitle="Easy Rasta is designed for everyone who loves to travel"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {TARGET_AUDIENCE.map((audience, index) => (
                            <FeatureCard
                                key={index}
                                title={audience.title}
                                description={audience.description}
                                icon={audience.icon}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* ==============================
                7. ABOUT US + YOUTUBE SECTION
               ============================== */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="About Easy Rasta"
                        subtitle="Built by travelers, for travelers"
                    />
                    <YouTubeSection
                        videoId="dQw4w9WgXcQ"
                        title="See Easy Rasta in Action"
                        description="Watch how Easy Rasta helps thousands of travelers track fuel prices, manage vehicle expenses, and connect with the riding community. Our mission is to make every journey smarter and more enjoyable."
                    />
                </div>
            </section>

            {/* ==============================
                8. DOWNLOAD CTA SECTION
               ============================== */}
            <section id="download" className="relative py-24 overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#2F777B] via-[#3a8a8e] to-[#7ADCE3]" />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7ADCE3]/30 to-transparent" />

                {/* Decorative circles */}
                <div className="absolute top-10 right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                <div className="absolute bottom-10 left-20 w-60 h-60 bg-[#CE5612]/10 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                        Ready to Start Your Journey?
                    </h2>
                    <p className="text-lg md:text-xl mb-10 text-white/80 max-w-2xl mx-auto">
                        Download Easy Rasta now and join thousands of travelers who are already enjoying a smarter travel experience.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href={APP_LINKS.playStore}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 rounded-xl px-6 py-4 border border-white/20 group hover:scale-105"
                        >
                            <div className="w-10 h-10 mr-3 text-white">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 0 1 0 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" />
                                </svg>
                            </div>
                            <div className="text-left text-white">
                                <div className="text-xs text-white/60">Get it on</div>
                                <div className="font-bold text-lg">Google Play</div>
                            </div>
                        </a>
                        <a
                            href={APP_LINKS.appStore}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-300 rounded-xl px-6 py-4 border border-white/20 group hover:scale-105"
                        >
                            <div className="w-10 h-10 mr-3 text-white">
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                                </svg>
                            </div>
                            <div className="text-left text-white">
                                <div className="text-xs text-white/60">Download on the</div>
                                <div className="font-bold text-lg">App Store</div>
                            </div>
                        </a>
                    </div>
                </div>
            </section>
        </>
    );
}
