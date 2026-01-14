
import React, { useState } from 'react';
import { faqData, FaqItemData } from '../../data/content';

interface FaqItemProps {
    item: FaqItemData;
}

const FaqItem: React.FC<FaqItemProps> = ({ item }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border border-gray-200 rounded-lg bg-white overflow-hidden transition-all duration-200 hover:shadow-md">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex justify-between items-center p-4 text-left transition-colors focus:outline-none ${isOpen ? 'bg-teal-50 text-teal-800' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
            >
                <span className="font-semibold text-sm md:text-base pr-4 flex items-start gap-2">
                    <i className="bi bi-question-circle-fill text-teal-500 mt-0.5 flex-shrink-0"></i>
                    {item.question}
                </span>
                <i className={`bi bi-chevron-down text-gray-400 transition-transform duration-300 flex-shrink-0 ${isOpen ? 'rotate-180 text-teal-600' : ''}`}></i>
            </button>
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
            >
                <div className="p-4 text-sm text-gray-600 border-t border-gray-100 leading-relaxed bg-white pl-10">
                    {item.answer}
                </div>
            </div>
        </div>
    );
};

export const TabFaq: React.FC = () => {
    return (
        <div className="columns-1 lg:columns-2 gap-8 space-y-8">
            {faqData.map((category, index) => (
                <div key={index} className="mb-8 break-inside-avoid">
                    <div className={`flex items-center gap-3 p-3 rounded-lg border-l-4 mb-4 ${category.colorClass}`}>
                        <i className={`bi ${category.icon} text-xl`}></i>
                        <h3 className="font-bold text-lg">{category.title}</h3>
                    </div>
                    <div className="space-y-2">
                        {category.items.map((item, i) => (
                            <FaqItem key={i} item={item} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
