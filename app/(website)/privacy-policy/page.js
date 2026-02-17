import SectionTitle from '@/components/SectionTitle';
import PageHero from '@/components/PageHero';

export const metadata = {
    title: 'Privacy Policy - Easy Rasta',
    description: 'Easy Rasta Privacy Policy - Learn how we collect, use, and protect your personal information.',
};

export default function PrivacyPolicyPage() {
    return (
        <>
            <PageHero
                title="Privacy Policy"
                subtitle="Last updated: January 2026"
            />

            {/* Content */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto prose prose-lg">
                        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Introduction</h2>
                            <p className="text-[#666666] mb-6">
                                Easy Rasta ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and website.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Information We Collect</h2>
                            <p className="text-[#666666] mb-4">We may collect information about you in a variety of ways:</p>
                            <ul className="list-disc pl-6 text-[#666666] mb-6 space-y-2">
                                <li><strong>Personal Data:</strong> Name, email address, phone number, and other contact information you provide.</li>
                                <li><strong>Vehicle Information:</strong> Details about your vehicles that you add to the app.</li>
                                <li><strong>Location Data:</strong> With your permission, we collect location data to provide fuel prices for your area.</li>
                                <li><strong>Usage Data:</strong> Information about how you use the app, including features accessed and actions taken.</li>
                                <li><strong>Device Information:</strong> Device type, operating system, and unique device identifiers.</li>
                            </ul>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">How We Use Your Information</h2>
                            <p className="text-[#666666] mb-4">We use the collected information for:</p>
                            <ul className="list-disc pl-6 text-[#666666] mb-6 space-y-2">
                                <li>Providing and maintaining our services</li>
                                <li>Personalizing your experience</li>
                                <li>Sending you fuel price alerts and notifications</li>
                                <li>Processing your expense records</li>
                                <li>Calculating and displaying XP scores</li>
                                <li>Improving our app and services</li>
                                <li>Communicating with you about updates and features</li>
                            </ul>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Data Security</h2>
                            <p className="text-[#666666] mb-6">
                                We implement appropriate security measures to protect your personal information. All data is encrypted in transit and at rest. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Third-Party Services</h2>
                            <p className="text-[#666666] mb-6">
                                We may use third-party services that collect, monitor, and analyze data to improve our service. These third parties have their own privacy policies addressing how they use such information.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Your Rights</h2>
                            <p className="text-[#666666] mb-4">You have the right to:</p>
                            <ul className="list-disc pl-6 text-[#666666] mb-6 space-y-2">
                                <li>Access your personal data</li>
                                <li>Correct inaccurate data</li>
                                <li>Request deletion of your data</li>
                                <li>Opt-out of marketing communications</li>
                                <li>Withdraw consent for data processing</li>
                            </ul>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Contact Us</h2>
                            <p className="text-[#666666]">
                                If you have questions about this Privacy Policy, please contact us at:<br />
                                Email: privacy@easyrasta.com<br />
                                Address: 123 Tech Park, Sector 5, Mumbai, Maharashtra 400001, India
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
