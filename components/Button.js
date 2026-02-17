import Link from 'next/link';

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    href,
    className = '',
    ...props
}) {
    const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-full transition-all duration-300 cursor-pointer';

    const variants = {
        primary: 'bg-[#CE5612] text-white hover:bg-[#F7AA29] shadow-lg hover:shadow-xl hover:shadow-[#CE5612]/20 active:scale-95',
        secondary: 'bg-white text-[#CE5612] border-2 border-[#CE5612] hover:bg-[#CE5612] hover:text-white',
        outline: 'bg-transparent text-[#2F777B] border-2 border-[#2F777B] hover:bg-[#2F777B] hover:text-white',
        dark: 'bg-[#2F777B] text-white hover:bg-[#245f62] shadow-lg hover:shadow-xl',
        light: 'bg-white/20 backdrop-blur-sm text-white border border-white/30 hover:bg-white/30',
    };

    const sizes = {
        sm: 'px-5 py-2 text-sm',
        md: 'px-7 py-3 text-base',
        lg: 'px-9 py-4 text-lg',
    };

    const styles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={styles} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button className={styles} {...props}>
            {children}
        </button>
    );
}
