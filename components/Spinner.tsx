
import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

interface SpinnerProps {
    message?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ message }) => {
    const { language, t } = useLanguage();
    
    const messages = {
        vi: [
            "Đang khởi tạo AI... Chờ chút nhé!",
            "Phân tích bối cảnh và ánh sáng...",
            "AI đang sáng tạo, vui lòng không tắt trình duyệt.",
            "Sắp xong rồi! Hoàn thiện chi tiết cuối cùng...",
            "Tối ưu hoá chất lượng ảnh cho bạn..."
        ],
        en: [
            "Initializing AI... Just a moment!",
            "Analyzing scene and lighting...",
            "The AI is creating, please don't close the browser.",
            "Almost there! Finalizing the last details...",
            "Optimizing image quality for you..."
        ]
    };
    
    const [currentMessage, setCurrentMessage] = useState(message || messages[language][0]);

    useEffect(() => {
        if (message) {
            setCurrentMessage(message);
            return;
        }
        const langMessages = messages[language];
        const interval = setInterval(() => {
            setCurrentMessage(langMessages[Math.floor(Math.random() * langMessages.length)]);
        }, 3000);
        return () => clearInterval(interval);
    }, [message, language]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-dark-card/50 rounded-lg">
            <svg className="animate-spin h-10 w-10 text-brand-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 * 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {/* FIX: This comparison appears to be unintentional because the types '"en"' and '"vi"' have no overlap. This is fixed by correcting the Language type in localization.ts. Now also using t() for translation. */}
            <p className="mt-4 text-lg font-semibold text-dark-text">{t('loading_message')}</p>
            <p className="mt-2 text-sm text-dark-text-secondary">{currentMessage}</p>
        </div>
    );
};
