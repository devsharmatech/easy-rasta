import AppScreenCard from '@/components/AppScreenCard';
import SectionTitle from '@/components/SectionTitle';
import Button from '@/components/Button';
import PageHero from '@/components/PageHero';
import { Download } from 'lucide-react';
import { APP_SCREENS } from '@/lib/constants';

export const metadata = {
    title: 'App Screens - Easy Rasta',
    description: 'Preview the Easy Rasta app interface - fuel prices, events, expense tracking, and XP profile screens.',
};

export default function AppScreensPage() {
    return (
        <>
            <PageHero
                title="App Screens"
                subtitle="Take a sneak peek at the Easy Rasta app interface and see how intuitive it is"
            />

            {/* App Screens Grid */}
            <section className="py-20">
                <div className="container mx-auto px-4">
                    <SectionTitle
                        title="Explore Our Interface"
                        subtitle="Clean, intuitive, and designed for the best user experience"
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

            {/* CTA Section */}
            <section className="py-20 bg-[#E5C6AA]/30">
                <div className="container mx-auto px-4 text-center">
                    <SectionTitle
                        title="Like What You See?"
                        subtitle="Download the app now and experience it yourself"
                    />
                    <Button href="/#download" size="lg">
                        <Download className="w-5 h-5 mr-2" />
                        Download Easy Rasta
                    </Button>
                </div>
            </section>
        </>
    );
}
