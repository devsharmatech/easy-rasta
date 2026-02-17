import {
    Download, UserPlus, Compass, Rocket
} from 'lucide-react';

export default function InfographicSection({ steps }) {
    const icons = { Download, UserPlus, Compass, Rocket };

    return (
        <div className="relative py-8">
            {/* Connecting Line (desktop) — behind everything */}
            <div className="hidden lg:block absolute top-[calc(50%-16px)] left-[10%] right-[10%] h-1 z-0">
                <div className="w-full h-full bg-gradient-to-r from-[#CE5612] via-[#F7AA29] via-60% via-[#7ADCE3] to-[#2F777B] rounded-full opacity-30" />
            </div>

            {/* Mobile Line — behind everything */}
            <div className="lg:hidden absolute top-0 bottom-0 left-8 w-1 bg-gradient-to-b from-[#CE5612] via-[#F7AA29] via-[#7ADCE3] to-[#2F777B] opacity-30 z-0" />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 lg:gap-6 relative z-10">
                {steps.map((step, i) => {
                    const IconComponent = icons[step.icon] || Download;
                    return (
                        <div key={i} className="flex lg:flex-col items-start lg:items-center gap-4 lg:gap-0 group">
                            {/* Icon Circle */}
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl relative z-20"
                                style={{
                                    background: `linear-gradient(135deg, ${step.color}, ${step.color}cc)`,
                                    boxShadow: `0 8px 25px ${step.color}30`,
                                }}
                            >
                                <IconComponent className="w-7 h-7 text-white" />
                            </div>

                            {/* Content */}
                            <div className="lg:text-center lg:mt-5 relative z-20 bg-white/80 backdrop-blur-sm lg:bg-transparent lg:backdrop-blur-none rounded-lg lg:rounded-none px-3 lg:px-0 py-1 lg:py-0">
                                <span className="text-xs font-bold uppercase tracking-widest text-[#999999] mb-1 block">
                                    Step {step.step}
                                </span>
                                <h3 className="text-lg font-bold text-[#1a1a1a] mb-1">{step.title}</h3>
                                <p className="text-[#666666] text-sm leading-relaxed max-w-[200px] lg:mx-auto">
                                    {step.description}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
