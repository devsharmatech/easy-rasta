import {
    Fuel, Calendar, Receipt, Trophy, Store, Map,
    Smartphone
} from 'lucide-react';

export default function AppScreenCard({ title, description, color, icon, index }) {
    const icons = {
        Fuel, Calendar, Receipt, Trophy, Store, Map,
    };
    const IconComponent = icons[icon] || Smartphone;

    return (
        <div className="group cursor-pointer">
            {/* Phone Mockup */}
            <div className="relative mx-auto w-48 h-[340px] rounded-[28px] border-4 border-[#1a1a1a] bg-[#0f0f0f] shadow-xl group-hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-3 overflow-hidden">
                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-[#1a1a1a] rounded-b-2xl z-10" />

                {/* Screen Content */}
                <div
                    className="w-full h-full flex flex-col items-center justify-center p-4 transition-all duration-500"
                    style={{
                        background: `linear-gradient(135deg, ${color}20, ${color}40)`,
                    }}
                >
                    <div
                        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-500 group-hover:scale-110"
                        style={{ backgroundColor: color }}
                    >
                        <IconComponent className="w-8 h-8 text-white" />
                    </div>
                    <h4 className="text-white text-sm font-bold text-center mb-1">{title}</h4>
                    <p className="text-white/60 text-xs text-center leading-relaxed">{description}</p>
                </div>
            </div>

            {/* Title Below */}
            <div className="text-center mt-4">
                <h3 className="font-bold text-[#1a1a1a] text-sm">{title}</h3>
                <p className="text-[#666666] text-xs mt-1">{description}</p>
            </div>
        </div>
    );
}
