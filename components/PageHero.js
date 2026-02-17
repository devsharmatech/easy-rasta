export default function PageHero({ title, subtitle }) {
    return (
        <section className="relative text-white pt-28 pb-16 overflow-hidden">
            {/* Background gradient — same as homepage hero */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#7ADCE3] via-[#4db8c0] to-[#2F777B]" />

            {/* Decorative blur shapes */}
            <div className="absolute top-10 left-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#CE5612]/10 rounded-full blur-3xl" />

            {/* Dot pattern */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '30px 30px',
            }} />

            <div className="container mx-auto px-4 text-center relative z-10">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
                {subtitle && (
                    <p className="text-xl text-white/90 max-w-2xl mx-auto">{subtitle}</p>
                )}
            </div>
        </section>
    );
}
