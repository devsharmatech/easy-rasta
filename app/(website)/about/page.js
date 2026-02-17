import SectionTitle from '@/components/SectionTitle';
import Button from '@/components/Button';
import PageHero from '@/components/PageHero';
import { Target, Eye, Heart, Users, Award, Zap } from 'lucide-react';

export const metadata = {
    title: 'About Us - Easy Rasta',
    description: 'Learn about Easy Rasta - our story, vision, mission, and why we created this app for travelers.',
};

export default function AboutPage() {
    return (
        <>
            <PageHero
                title="About Easy Rasta"
                subtitle="Empowering travelers with smart tools and a vibrant community"
            />

            {/* Brand Story */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <SectionTitle
                            title="Our Story"
                            subtitle="How Easy Rasta came to be"
                        />
                        <div className="prose prose-lg max-w-none">
                            <p className="text-[#666666] text-lg leading-relaxed mb-6">
                                Easy Rasta was born from a simple frustration that every traveler knows too well - the lack of a comprehensive tool to manage travel expenses, find accurate fuel prices, and connect with fellow travelers.
                            </p>
                            <p className="text-[#666666] text-lg leading-relaxed mb-6">
                                In 2024, a group of passionate travelers and tech enthusiasts came together with a vision to create the ultimate travel companion app. We wanted to build something that would make every journey smoother, more affordable, and more enjoyable.
                            </p>
                            <p className="text-[#666666] text-lg leading-relaxed">
                                Today, Easy Rasta has grown into a thriving community of travelers who share the same passion for the open road. From daily commuters to weekend adventurers, our app serves everyone who loves to travel.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Vision & Mission */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
                        {/* Vision */}
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-2xl flex items-center justify-center mb-6">
                                <Eye className="w-8 h-8 text-[#CE5612]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4">Our Vision</h3>
                            <p className="text-[#666666] leading-relaxed">
                                To become the most trusted and comprehensive travel companion for every traveler in India and beyond. We envision a world where every journey is well-planned, cost-effective, and filled with meaningful connections.
                            </p>
                        </div>

                        {/* Mission */}
                        <div className="bg-white rounded-2xl shadow-lg p-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-2xl flex items-center justify-center mb-6">
                                <Target className="w-8 h-8 text-[#CE5612]" />
                            </div>
                            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-4">Our Mission</h3>
                            <p className="text-[#666666] leading-relaxed">
                                To empower travelers with accurate fuel price information, smart expense tracking tools, and a vibrant community platform that makes every journey more enjoyable and rewarding.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Why Easy Rasta */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Why Easy Rasta?"
                        subtitle="What makes us different from the rest"
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {[
                            { icon: Heart, title: 'Built with Passion', desc: 'Created by travelers, for travelers. We understand your needs because we share them.' },
                            { icon: Users, title: 'Community First', desc: 'Connect with fellow travelers, join events, and be part of a growing community.' },
                            { icon: Zap, title: 'Always Improving', desc: 'We constantly update our app based on user feedback to deliver the best experience.' },
                            { icon: Award, title: 'Reward System', desc: 'Earn XP for your activities and get recognized for being an active traveler.' },
                            { icon: Target, title: 'Accurate Data', desc: 'Real-time fuel prices and reliable data you can trust for planning your trips.' },
                            { icon: Eye, title: 'User Privacy', desc: 'Your data is secure and private. We never share your information without consent.' },
                        ].map(({ icon: Icon, title, desc }, i) => (
                            <div key={i} className="text-center group">
                                <div className="w-16 h-16 bg-gradient-to-br from-[#2F777B]/10 to-[#7ADCE3]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                                    <Icon className="w-8 h-8 text-[#2F777B]" />
                                </div>
                                <h4 className="text-xl font-bold text-[#1a1a1a] mb-2">{title}</h4>
                                <p className="text-[#666666]">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Watch Us in Action — YouTube */}
            <section className="py-20 bg-[#E5C6AA]/30 relative overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute top-10 right-10 w-48 h-48 bg-[#CE5612]/5 rounded-full blur-3xl" />
                <div className="absolute bottom-10 left-10 w-64 h-64 bg-[#7ADCE3]/5 rounded-full blur-3xl" />

                <div className="container mx-auto px-4 relative z-10">
                    <SectionTitle
                        title="Watch Us in Action"
                        subtitle="See how Easy Rasta is transforming the way travelers explore India"
                    />

                    <div className="max-w-5xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10 items-center">
                            {/* Video Player — 3 cols */}
                            <div className="lg:col-span-3">
                                <div className="relative group">
                                    {/* Gradient glow */}
                                    <div className="absolute -inset-3 bg-gradient-to-br from-[#CE5612]/20 via-[#F7AA29]/10 to-[#7ADCE3]/20 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                                        <div className="aspect-video">
                                            <iframe
                                                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                                                title="Easy Rasta — See It in Action"
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Info card — 2 cols */}
                            <div className="lg:col-span-2 space-y-6">
                                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                                    <h3 className="text-xl font-bold text-[#1a1a1a] mb-3">See Easy Rasta in Action</h3>
                                    <p className="text-[#666666] leading-relaxed mb-5">
                                        Watch how thousands of riders and travelers use Easy Rasta every day to track fuel prices, manage expenses, and connect with the travel community.
                                    </p>

                                    {/* Social proof */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex -space-x-2">
                                            {['#CE5612', '#F7AA29', '#7ADCE3', '#2F777B'].map((c, i) => (
                                                <div
                                                    key={i}
                                                    className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
                                                    style={{ backgroundColor: c }}
                                                >
                                                    {['R', 'A', 'S', 'T'][i]}
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-sm text-[#666666]">10K+ travelers love it</span>
                                    </div>

                                    <Button href="/#download" size="sm">
                                        Download Now
                                    </Button>
                                </div>

                                {/* Stats mini cards */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { value: '10K+', label: 'Downloads', color: '#CE5612' },
                                        { value: '4.8★', label: 'Rating', color: '#F7AA29' },
                                    ].map((stat, i) => (
                                        <div key={i} className="bg-white rounded-xl p-4 text-center shadow-md border border-gray-100">
                                            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
                                            <p className="text-xs text-[#666666] mt-1">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-br from-[#2F777B] to-[#7ADCE3] text-white">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Join the Easy Rasta Family
                    </h2>
                    <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
                        Be part of our growing community of travelers and start your journey with us today.
                    </p>
                    <Button href="/#download" variant="dark" size="lg">
                        Download the App
                    </Button>
                </div>
            </section>
        </>
    );
}
