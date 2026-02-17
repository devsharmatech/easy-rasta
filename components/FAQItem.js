'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export default function FAQItem({ question, answer, isOpen = false }) {
    const [open, setOpen] = useState(isOpen);

    return (
        <div className="border-b border-gray-200 last:border-b-0">
            <button
                className="w-full py-5 flex items-center justify-between text-left"
                onClick={() => setOpen(!open)}
            >
                <span className="text-lg font-medium text-[#333333] pr-8">{question}</span>
                {open ? (
                    <ChevronUp className="w-5 h-5 text-[#CE5612] flex-shrink-0" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-[#CE5612] flex-shrink-0" />
                )}
            </button>
            {open && (
                <div className="pb-5">
                    <p className="text-[#666666] leading-relaxed">{answer}</p>
                </div>
            )}
        </div>
    );
}
