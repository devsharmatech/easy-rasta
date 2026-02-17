import FeatureCard from '@/components/FeatureCard';
import SectionTitle from '@/components/SectionTitle';
import Button from '@/components/Button';
import PageHero from '@/components/PageHero';
import { FEATURES } from '@/lib/constants';
import { ArrowRight } from 'lucide-react';

export const metadata = {
    title: 'Features - Easy Rasta',
    description: 'Discover all the powerful features of Easy Rasta - fuel price tracking, event discovery, vehicle expense management, and XP scores.',
};

export default function FeaturesPage() {
    return (
        <>
            <PageHero
                title="Powerful Features"
                subtitle="Explore all the amazing features that make Easy Rasta your perfect travel companion"
            />

            {/* Features List */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <div className="space-y-8">
                        {FEATURES.map((feature, index) => (
                            <FeatureCard
                                key={feature.id}
                                title={feature.title}
                                description={feature.description}
                                icon={feature.icon}
                                highlights={feature.highlights}
                                youtubeLink={feature.youtubeLink}
                                variant="detailed"
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4 text-center">
                    <SectionTitle
                        title="Ready to Experience These Features?"
                        subtitle="Download Easy Rasta now and start your journey today"
                    />
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Button href="/#download" size="lg">
                            Download Now
                        </Button>
                        <Button href="/app-screens" variant="outline" size="lg">
                            View App Screens
                            <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                    </div>
                </div>
            </section>
        </>
    );
}
