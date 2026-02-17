import FAQItem from '@/components/FAQItem';
import SectionTitle from '@/components/SectionTitle';
import Button from '@/components/Button';
import PageHero from '@/components/PageHero';
import { FAQS } from '@/lib/constants';
import { MessageCircle } from 'lucide-react';

export const metadata = {
    title: 'FAQ - Easy Rasta',
    description: 'Find answers to frequently asked questions about Easy Rasta - fuel prices, vehicle tracking, XP scores, and more.',
};

export default function FAQPage() {
    return (
        <>
            <PageHero
                title="Frequently Asked Questions"
                subtitle="Find answers to the most common questions about Easy Rasta"
            />

            {/* FAQ Section */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                            {FAQS.map((faq, index) => (
                                <FAQItem
                                    key={index}
                                    question={faq.question}
                                    answer={faq.answer}
                                    isOpen={index === 0}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Still Have Questions */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4 text-center">
                    <SectionTitle
                        title="Still Have Questions?"
                        subtitle="Can't find what you're looking for? We're here to help!"
                    />
                    <Button href="/contact" size="lg">
                        <MessageCircle className="w-5 h-5 mr-2" />
                        Contact Us
                    </Button>
                </div>
            </section>
        </>
    );
}
