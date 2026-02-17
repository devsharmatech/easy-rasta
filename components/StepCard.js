import {
    Fuel, Calendar, Receipt, Trophy, Car, Users,
    Award, Briefcase, Map, Bike, Wallet, Store
} from 'lucide-react';

export default function StepCard({ step, title, description, icon }) {
    const icons = {
        Fuel, Calendar, Receipt, Trophy, Car, Users,
        Award, Briefcase, Map, Bike, Wallet, Store,
    };

    const IconComponent = icons[icon] || Car;

    return (
        <div className="relative group h-full">
            {/* Step Number */}
            <div className="absolute -top-4 -left-4 w-12 h-12 bg-gradient-to-br from-[#CE5612] to-[#F7AA29] rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-[#CE5612]/25 z-10 group-hover:scale-110 transition-transform duration-300">
                {step}
            </div>

            <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-8 pt-10 border border-gray-100 group-hover:-translate-y-1 h-full flex flex-col">
                <div className="w-14 h-14 bg-[#2F777B]/10 rounded-2xl flex items-center justify-center mb-4">
                    <IconComponent className="w-7 h-7 text-[#2F777B]" />
                </div>
                <h3 className="text-xl font-bold text-[#1a1a1a] mb-2">{title}</h3>
                <p className="text-[#666666] text-sm leading-relaxed">{description}</p>
            </div>
        </div>
    );
}
