export default function SectionTitle({
    title,
    subtitle,
    align = 'center',
    light = false,
    className = ''
}) {
    const alignClasses = {
        left: 'text-left',
        center: 'text-center',
        right: 'text-right',
    };

    return (
        <div className={`mb-12 ${alignClasses[align]} ${className}`}>
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${light ? 'text-white' : 'text-[#1a1a1a]'}`}>
                {title}
            </h2>
            {subtitle && (
                <p className={`text-lg max-w-2xl ${align === 'center' ? 'mx-auto' : ''} ${light ? 'text-white/80' : 'text-[#666666]'}`}>
                    {subtitle}
                </p>
            )}
            <div className={`w-20 h-1 bg-gradient-to-r from-[#CE5612] to-[#F7AA29] mt-4 rounded-full ${align === 'center' ? 'mx-auto' : ''}`} />
        </div>
    );
}
