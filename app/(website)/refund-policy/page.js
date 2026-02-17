import PageHero from '@/components/PageHero';

export const metadata = {
    title: 'Refund Policy - Easy Rasta',
    description: 'Easy Rasta Refund Policy - Learn about our refund and cancellation policies.',
};

export default function RefundPolicyPage() {
    return (
        <>
            <PageHero
                title="Refund Policy"
                subtitle="Last updated: January 2026"
            />

            {/* Content */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto prose prose-lg">
                        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Free Services</h2>
                            <p className="text-[#666666] mb-6">
                                Easy Rasta is currently a free application. All core features including fuel price tracking, event discovery, vehicle expense tracking, and XP scores are available at no cost to users.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Future Paid Services</h2>
                            <p className="text-[#666666] mb-6">
                                In the future, we may introduce premium features or subscription plans. This refund policy will be updated accordingly to reflect the terms for any paid services.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">In-App Purchases</h2>
                            <p className="text-[#666666] mb-6">
                                If we introduce in-app purchases in the future, refunds will be handled according to the policies of the respective app stores (Google Play Store and Apple App Store). Users should refer to the store's refund policy for any in-app purchase issues.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Event Participation</h2>
                            <p className="text-[#666666] mb-6">
                                For any paid events organized through the Easy Rasta platform, refund policies are determined by the event organizers. Users should review the specific refund terms before registering for paid events.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Contact Us</h2>
                            <p className="text-[#666666]">
                                For any questions regarding refunds or this policy, please contact us at:<br />
                                Email: support@easyrasta.com<br />
                                Address: 123 Tech Park, Sector 5, Mumbai, Maharashtra 400001, India
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
