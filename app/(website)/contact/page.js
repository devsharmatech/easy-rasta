import ContactForm from '@/components/ContactForm';
import SectionTitle from '@/components/SectionTitle';
import PageHero from '@/components/PageHero';
import { Mail, MapPin, Phone, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';
import { SOCIAL_LINKS } from '@/lib/constants';

export const metadata = {
    title: 'Contact Us - Easy Rasta',
    description: 'Get in touch with Easy Rasta team. We\'re here to help with any questions or feedback.',
};

export default function ContactPage() {
    return (
        <>
            <PageHero
                title="Contact Us"
                subtitle="Have questions or feedback? We'd love to hear from you!"
            />

            {/* Contact Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
                        {/* Contact Information */}
                        <div className="lg:col-span-1">
                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Get in Touch</h2>

                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-6 h-6 text-[#CE5612]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1a1a1a] mb-1">Email Us</h3>
                                        <a href="mailto:support@easyrasta.com" className="text-[#666666] hover:text-[#CE5612] transition-colors">
                                            support@easyrasta.com
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <Phone className="w-6 h-6 text-[#CE5612]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1a1a1a] mb-1">Call Us</h3>
                                        <a href="tel:+911234567890" className="text-[#666666] hover:text-[#CE5612] transition-colors">
                                            +91 12345 67890
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-6 h-6 text-[#CE5612]" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-[#1a1a1a] mb-1">Visit Us</h3>
                                        <p className="text-[#666666]">
                                            123 Tech Park, Sector 5<br />
                                            Mumbai, Maharashtra 400001<br />
                                            India
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Social Links */}
                            <div className="mt-8">
                                <h3 className="font-semibold text-[#1a1a1a] mb-4">Follow Us</h3>
                                <div className="flex gap-3">
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
                                            className="w-10 h-10 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-full flex items-center justify-center text-[#CE5612] hover:bg-[#CE5612] hover:text-white transition-all duration-300"
                                        >
                                            <Icon className="w-5 h-5" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                                <h2 className="text-2xl font-bold text-[#1a1a1a] mb-6">Send Us a Message</h2>
                                <ContactForm />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Support Hours */}
            <section className="py-12 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4 text-center">
                    <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">Support Hours</h3>
                    <p className="text-[#666666]">
                        Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                        Saturday: 10:00 AM - 4:00 PM IST<br />
                        Sunday: Closed
                    </p>
                </div>
            </section>
        </>
    );
}
