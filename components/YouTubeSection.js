import { Play } from 'lucide-react';

export default function YouTubeSection({ videoId = 'dQw4w9WgXcQ', title, description }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Text Content */}
            <div>
                <h3 className="text-2xl md:text-3xl font-bold text-[#1a1a1a] mb-4 leading-tight">
                    {title || 'See Easy Rasta in Action'}
                </h3>
                <p className="text-[#666666] text-lg leading-relaxed mb-6">
                    {description || 'Watch how Easy Rasta helps thousands of travelers track fuel prices, manage vehicle expenses, and connect with the riding community.'}
                </p>
                <div className="flex items-center gap-3 text-sm text-[#2F777B] font-medium">
                    <div className="flex -space-x-2">
                        {[...Array(4)].map((_, i) => (
                            <div
                                key={i}
                                className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-[#CE5612] to-[#F7AA29] flex items-center justify-center text-white text-[10px] font-bold"
                            >
                                {String.fromCharCode(65 + i)}
                            </div>
                        ))}
                    </div>
                    <span>Join 10,000+ Happy Riders</span>
                </div>
            </div>

            {/* Video Player */}
            <div className="relative group">
                <div className="absolute -inset-3 bg-gradient-to-br from-[#CE5612]/20 to-[#7ADCE3]/20 rounded-3xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-2 border-white/80">
                    <div className="aspect-video">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title="Easy Rasta Demo"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="w-full h-full"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
