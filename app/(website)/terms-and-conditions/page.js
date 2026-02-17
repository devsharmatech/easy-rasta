import PageHero from '@/components/PageHero';

export const metadata = {
    title: 'Terms & Conditions - Easy Rasta',
    description: 'Easy Rasta Terms and Conditions - Read the terms governing your use of our services.',
};

export default function TermsPage() {
    return (
        <>
            <PageHero
                title="Terms & Conditions"
                subtitle="Last updated: January 2026"
            />

            {/* Content */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto prose prose-lg">
                        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-100">
                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Acceptance of Terms</h2>
                            <p className="text-[#666666] mb-6">
                                By downloading, installing, or using the Easy Rasta application, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Use of Services</h2>
                            <p className="text-[#666666] mb-4">You agree to use our services only for lawful purposes. You must not:</p>
                            <ul className="list-disc pl-6 text-[#666666] mb-6 space-y-2">
                                <li>Use the app in any way that violates applicable laws or regulations</li>
                                <li>Attempt to gain unauthorized access to our systems</li>
                                <li>Interfere with or disrupt the integrity of our services</li>
                                <li>Upload malicious content or viruses</li>
                                <li>Impersonate others or provide false information</li>
                            </ul>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">User Accounts</h2>
                            <p className="text-[#666666] mb-6">
                                You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized access to your account. We reserve the right to suspend or terminate accounts that violate these terms.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Fuel Price Information</h2>
                            <p className="text-[#666666] mb-6">
                                While we strive to provide accurate fuel price information, we do not guarantee the accuracy, completeness, or timeliness of this data. Fuel prices are subject to change and may vary by location. Users should verify prices at the fuel station before refueling.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Events and Community</h2>
                            <p className="text-[#666666] mb-6">
                                Easy Rasta provides a platform for users to discover and participate in travel events. We are not responsible for the organization, safety, or conduct of these events. Users participate in events at their own risk and should exercise due diligence.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Intellectual Property</h2>
                            <p className="text-[#666666] mb-6">
                                All content, features, and functionality of Easy Rasta, including but not limited to text, graphics, logos, and software, are the exclusive property of Easy Rasta and are protected by copyright and other intellectual property laws.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Limitation of Liability</h2>
                            <p className="text-[#666666] mb-6">
                                To the maximum extent permitted by law, Easy Rasta shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of our services.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Changes to Terms</h2>
                            <p className="text-[#666666] mb-6">
                                We reserve the right to modify these terms at any time. We will notify users of any material changes through the app or via email. Your continued use of the app after such modifications constitutes acceptance of the updated terms.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Governing Law</h2>
                            <p className="text-[#666666] mb-6">
                                These terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
                            </p>

                            <h2 className="text-2xl font-bold text-[#1a1a1a] mb-4">Contact Us</h2>
                            <p className="text-[#666666]">
                                For any questions regarding these Terms and Conditions, please contact us at:<br />
                                Email: legal@easyrasta.com<br />
                                Address: 123 Tech Park, Sector 5, Mumbai, Maharashtra 400001, India
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
