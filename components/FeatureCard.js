import {
    Fuel,
    Calendar,
    Receipt,
    Trophy,
    Car,
    Users,
    Award,
    Briefcase,
    Map,
    Bike,
    Wallet,
    Store,
    CheckCircle,
    Play
} from 'lucide-react';

// Animated SVG illustrations mapped by icon name
function AnimatedIllustration({ icon }) {
    const illustrations = {
        Fuel: (
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Fuel pump body */}
                <rect x="50" y="60" width="60" height="90" rx="8" fill="#CE5612" opacity="0.15">
                    <animate attributeName="opacity" values="0.15;0.25;0.15" dur="3s" repeatCount="indefinite" />
                </rect>
                <rect x="55" y="65" width="50" height="35" rx="4" fill="#CE5612" opacity="0.3" />
                {/* Digital display */}
                <rect x="60" y="70" width="40" height="25" rx="3" fill="white" stroke="#CE5612" strokeWidth="1.5" />
                <text x="80" y="87" textAnchor="middle" fill="#CE5612" fontSize="10" fontWeight="bold">₹98.5</text>
                {/* Nozzle */}
                <path d="M110 80 L130 70 L135 75 L140 60" stroke="#2F777B" strokeWidth="3" strokeLinecap="round" fill="none">
                    <animate attributeName="d" values="M110 80 L130 70 L135 75 L140 60;M110 80 L130 72 L137 73 L142 58;M110 80 L130 70 L135 75 L140 60" dur="2s" repeatCount="indefinite" />
                </path>
                {/* Fuel drops */}
                <circle cx="140" cy="65" r="3" fill="#F7AA29">
                    <animate attributeName="cy" values="65;120;65" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="135" cy="75" r="2" fill="#CE5612">
                    <animate attributeName="cy" values="75;130;75" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Base */}
                <rect x="45" y="150" width="70" height="8" rx="4" fill="#2F777B" opacity="0.3" />
                {/* Floating price tags */}
                <g opacity="0.6">
                    <rect x="130" y="100" width="45" height="20" rx="10" fill="#7ADCE3" opacity="0.3">
                        <animate attributeName="y" values="100;95;100" dur="3s" repeatCount="indefinite" />
                    </rect>
                    <text x="152" y="114" textAnchor="middle" fill="#2F777B" fontSize="8" fontWeight="600">
                        <animate attributeName="y" values="114;109;114" dur="3s" repeatCount="indefinite" />
                        Live
                    </text>
                </g>
            </svg>
        ),
        Calendar: (
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Calendar body */}
                <rect x="40" y="50" width="100" height="100" rx="12" fill="#7ADCE3" opacity="0.15">
                    <animate attributeName="opacity" values="0.15;0.25;0.15" dur="3s" repeatCount="indefinite" />
                </rect>
                <rect x="40" y="50" width="100" height="30" rx="12" fill="#2F777B" opacity="0.2" />
                {/* Calendar hooks */}
                <line x1="65" y1="42" x2="65" y2="58" stroke="#2F777B" strokeWidth="3" strokeLinecap="round" />
                <line x1="115" y1="42" x2="115" y2="58" stroke="#2F777B" strokeWidth="3" strokeLinecap="round" />
                {/* Date grid */}
                {[0, 1, 2, 3].map((row) =>
                    [0, 1, 2, 3].map((col) => (
                        <rect
                            key={`${row}-${col}`}
                            x={52 + col * 22}
                            y={88 + row * 14}
                            width="16"
                            height="10"
                            rx="2"
                            fill={row === 1 && col === 2 ? '#CE5612' : '#2F777B'}
                            opacity={row === 1 && col === 2 ? 0.6 : 0.1}
                        />
                    ))
                )}
                {/* Notification bell */}
                <g>
                    <circle cx="150" cy="55" r="15" fill="#CE5612" opacity="0.15">
                        <animate attributeName="r" values="15;17;15" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="150" y="60" textAnchor="middle" fill="#CE5612" fontSize="14">🔔</text>
                    <animateTransform attributeName="transform" type="rotate" values="0 150 55;5 150 55;-5 150 55;0 150 55" dur="1s" repeatCount="indefinite" />
                </g>
                {/* People icons floating */}
                <circle cx="155" cy="110" r="6" fill="#F7AA29" opacity="0.5">
                    <animate attributeName="cy" values="110;105;110" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="165" cy="120" r="4" fill="#CE5612" opacity="0.4">
                    <animate attributeName="cy" values="120;115;120" dur="3s" repeatCount="indefinite" />
                </circle>
            </svg>
        ),
        Receipt: (
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Receipt paper */}
                <path d="M55 40 L55 150 L60 145 L65 150 L70 145 L75 150 L80 145 L85 150 L90 145 L95 150 L100 145 L105 150 L110 145 L115 150 L120 145 L125 150 L125 40 Z" fill="#E5C6AA" opacity="0.4">
                    <animate attributeName="d" values="M55 40 L55 150 L60 145 L65 150 L70 145 L75 150 L80 145 L85 150 L90 145 L95 150 L100 145 L105 150 L110 145 L115 150 L120 145 L125 150 L125 40 Z;M55 40 L55 155 L60 150 L65 155 L70 150 L75 155 L80 150 L85 155 L90 150 L95 155 L100 150 L105 155 L110 150 L115 155 L120 150 L125 155 L125 40 Z;M55 40 L55 150 L60 145 L65 150 L70 145 L75 150 L80 145 L85 150 L90 145 L95 150 L100 145 L105 150 L110 145 L115 150 L120 145 L125 150 L125 40 Z" dur="4s" repeatCount="indefinite" />
                </path>
                <rect x="55" y="40" width="70" height="15" rx="4" fill="#CE5612" opacity="0.2" />
                {/* Receipt lines */}
                <line x1="65" y1="68" x2="115" y2="68" stroke="#2F777B" strokeWidth="2" opacity="0.3" />
                <line x1="65" y1="82" x2="105" y2="82" stroke="#2F777B" strokeWidth="2" opacity="0.2" />
                <line x1="65" y1="96" x2="110" y2="96" stroke="#2F777B" strokeWidth="2" opacity="0.3" />
                <line x1="65" y1="110" x2="100" y2="110" stroke="#2F777B" strokeWidth="2" opacity="0.2" />
                {/* Total amount */}
                <text x="90" y="132" textAnchor="middle" fill="#CE5612" fontSize="11" fontWeight="bold">₹2,450</text>
                {/* Floating coins */}
                <circle cx="145" cy="70" r="10" fill="#F7AA29" opacity="0.3">
                    <animate attributeName="cy" values="70;60;70" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="145" y="74" textAnchor="middle" fill="#CE5612" fontSize="9" fontWeight="bold">
                    <animate attributeName="y" values="74;64;74" dur="2s" repeatCount="indefinite" />
                    ₹
                </text>
                <circle cx="160" cy="95" r="8" fill="#CE5612" opacity="0.2">
                    <animate attributeName="cy" values="95;85;95" dur="2.5s" repeatCount="indefinite" />
                </circle>
                {/* Chart arrow */}
                <path d="M140 140 L150 120 L160 130 L170 100" stroke="#2F777B" strokeWidth="2" fill="none" strokeLinecap="round">
                    <animate attributeName="opacity" values="0.3;0.6;0.3" dur="3s" repeatCount="indefinite" />
                </path>
            </svg>
        ),
        Trophy: (
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Trophy cup */}
                <path d="M70 60 L75 110 L105 110 L110 60 Z" fill="#F7AA29" opacity="0.3">
                    <animate attributeName="opacity" values="0.3;0.45;0.3" dur="2s" repeatCount="indefinite" />
                </path>
                {/* Trophy handles */}
                <path d="M70 70 C50 70 45 95 65 100" stroke="#F7AA29" strokeWidth="3" fill="none" opacity="0.4" />
                <path d="M110 70 C130 70 135 95 115 100" stroke="#F7AA29" strokeWidth="3" fill="none" opacity="0.4" />
                {/* Trophy stem */}
                <rect x="82" y="110" width="16" height="15" rx="2" fill="#CE5612" opacity="0.3" />
                <rect x="72" y="125" width="36" height="8" rx="4" fill="#CE5612" opacity="0.4" />
                {/* Star */}
                <polygon points="90,50 93,58 102,58 95,63 97,72 90,67 83,72 85,63 78,58 87,58" fill="#F7AA29" opacity="0.8">
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="1.5s" repeatCount="indefinite" />
                    <animateTransform attributeName="transform" type="scale" values="1;1.1;1" dur="1.5s" repeatCount="indefinite" additive="sum" />
                </polygon>
                {/* XP badges floating */}
                <g>
                    <circle cx="140" cy="65" r="14" fill="#7ADCE3" opacity="0.2">
                        <animate attributeName="r" values="14;16;14" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <text x="140" y="69" textAnchor="middle" fill="#2F777B" fontSize="9" fontWeight="bold">XP</text>
                </g>
                {/* Sparkles */}
                <circle cx="55" cy="55" r="2" fill="#F7AA29">
                    <animate attributeName="opacity" values="0;1;0" dur="1.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="130" cy="45" r="1.5" fill="#CE5612">
                    <animate attributeName="opacity" values="0;1;0" dur="2s" repeatCount="indefinite" begin="0.5s" />
                </circle>
                <circle cx="145" cy="100" r="2" fill="#F7AA29">
                    <animate attributeName="opacity" values="0;1;0" dur="1.8s" repeatCount="indefinite" begin="0.3s" />
                </circle>
                {/* Level up arrow */}
                <path d="M155 130 L155 110 L150 115 M155 110 L160 115" stroke="#CE5612" strokeWidth="2" strokeLinecap="round" opacity="0.5">
                    <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite" />
                </path>
            </svg>
        ),
        Store: (
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                {/* Store building */}
                <rect x="45" y="75" width="90" height="70" rx="6" fill="#2F777B" opacity="0.12">
                    <animate attributeName="opacity" values="0.12;0.2;0.12" dur="3s" repeatCount="indefinite" />
                </rect>
                {/* Store awning */}
                <path d="M40 75 Q55 60 70 75 Q85 60 100 75 Q115 60 130 75 Q145 60 140 75" fill="#CE5612" opacity="0.25" />
                {/* Door */}
                <rect x="75" y="110" width="30" height="35" rx="4" fill="#7ADCE3" opacity="0.2" />
                <circle cx="100" cy="128" r="2" fill="#2F777B" opacity="0.5" />
                {/* Window */}
                <rect x="52" y="88" width="20" height="16" rx="2" fill="#7ADCE3" opacity="0.15" />
                <line x1="62" y1="88" x2="62" y2="104" stroke="#2F777B" strokeWidth="1" opacity="0.2" />
                <rect x="108" y="88" width="20" height="16" rx="2" fill="#7ADCE3" opacity="0.15" />
                <line x1="118" y1="88" x2="118" y2="104" stroke="#2F777B" strokeWidth="1" opacity="0.2" />
                {/* Wrench tool floating */}
                <g>
                    <circle cx="150" cy="60" r="12" fill="#F7AA29" opacity="0.15">
                        <animate attributeName="cy" values="60;55;60" dur="2.5s" repeatCount="indefinite" />
                    </circle>
                    <text x="150" y="64" textAnchor="middle" fontSize="14">
                        <animate attributeName="y" values="64;59;64" dur="2.5s" repeatCount="indefinite" />
                        🔧
                    </text>
                </g>
                {/* Star rating */}
                <g opacity="0.6">
                    {[0, 1, 2, 3, 4].map((i) => (
                        <text key={i} x={140 + i * 12} y="105" fontSize="9" fill="#F7AA29">
                            <animate attributeName="opacity" values="0.4;1;0.4" dur="2s" repeatCount="indefinite" begin={`${i * 0.2}s`} />
                            ★
                        </text>
                    ))}
                </g>
                {/* Location pin */}
                <g>
                    <circle cx="40" cy="55" r="8" fill="#CE5612" opacity="0.15">
                        <animate attributeName="cy" values="55;50;55" dur="3s" repeatCount="indefinite" />
                    </circle>
                    <text x="40" y="59" textAnchor="middle" fontSize="10">
                        <animate attributeName="y" values="59;54;59" dur="3s" repeatCount="indefinite" />
                        📍
                    </text>
                </g>
            </svg>
        ),
    };

    return illustrations[icon] || illustrations.Fuel;
}

export default function FeatureCard({
    title,
    description,
    icon,
    highlights = [],
    youtubeLink,
    variant = 'default'
}) {
    const icons = {
        Fuel, Calendar, Receipt, Trophy, Car, Users,
        Award, Briefcase, Map, Bike, Wallet, Store,
    };

    const IconComponent = icons[icon] || Fuel;

    if (variant === 'detailed') {
        return (
            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 border border-gray-100 group overflow-hidden">
                <div className="flex flex-col lg:flex-row items-start gap-6">
                    {/* Left: Content */}
                    <div className="flex items-start gap-5 flex-1 min-w-0">
                        <div className="w-14 h-14 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                            <IconComponent className="w-7 h-7 text-[#CE5612]" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">{title}</h3>
                            <p className="text-[#666666] mb-4 leading-relaxed">{description}</p>

                            {highlights.length > 0 && (
                                <ul className="space-y-2 mb-4">
                                    {highlights.map((highlight, index) => (
                                        <li key={index} className="flex items-center gap-2 text-[#333333]">
                                            <CheckCircle className="w-5 h-5 text-[#2F777B] flex-shrink-0" />
                                            <span className="text-sm">{highlight}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {youtubeLink && (
                                <a
                                    href={youtubeLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 text-[#CE5612] font-medium hover:text-[#F7AA29] transition-colors"
                                >
                                    <Play className="w-5 h-5" />
                                    Watch Demo Video
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Right: Animated SVG Illustration */}
                    <div className="hidden lg:block w-48 h-48 flex-shrink-0 opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500">
                        <AnimatedIllustration icon={icon} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6 text-center group border border-gray-100 hover:-translate-y-1">
            <div className="w-14 h-14 bg-gradient-to-br from-[#CE5612]/10 to-[#F7AA29]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <IconComponent className="w-7 h-7 text-[#CE5612]" />
            </div>
            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2">{title}</h3>
            <p className="text-[#666666] text-sm leading-relaxed">{description}</p>
        </div>
    );
}
