
interface GeminiApiError {
    code: number;
    message: string;
    status: string;
}

interface GeminiErrorPayload {
    error: GeminiApiError;
}

export const parseGeminiError = (error: any): string => {
    if (!error) {
        return 'An unknown error occurred.';
    }
    
    // The error object itself might have the structured error.
    if (error.error?.message) {
        const geminiError = error.error as GeminiApiError;
        if (geminiError.status === 'RESOURCE_EXHAUSTED') {
            return "You have exceeded your API quota. Please check your plan and billing details on Google AI Platform or try again later.";
        }
        return `API Error: ${geminiError.message}`;
    }

    // Check if error.message contains a JSON string
    if (typeof error.message === 'string') {
        const message = error.message;
        
        try {
            // The error message might be prefixed with text like "[GoogleGenerativeAI Error]: "
            const jsonStartIndex = message.indexOf('{');
            if (jsonStartIndex !== -1) {
                const jsonEndIndex = message.lastIndexOf('}');
                if (jsonEndIndex > jsonStartIndex) {
                    const jsonString = message.substring(jsonStartIndex, jsonEndIndex + 1);
                    const parsed = JSON.parse(jsonString) as GeminiErrorPayload;

                    if (parsed.error && parsed.error.message) {
                        if (parsed.error.status === 'RESOURCE_EXHAUSTED') {
                           return "You have exceeded your API quota. Please check your plan and billing details on Google AI Platform or try again later.";
                        }
                        return `API Error: ${parsed.error.message}`;
                    }
                }
            }
        } catch (e) {
            // Not a valid JSON or doesn't match expected structure, so just return the original message.
            return message;
        }
        
        // If no JSON found, return the message as is.
        return message;
    }

    return 'An unknown error occurred. Please check the console for more details.';
};
