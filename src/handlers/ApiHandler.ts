export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

export async function postRequest<T>(url: string, body: any): Promise<ApiResponse<T>> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorText = await response.text();
            return {
                success: false,
                error: errorText,
            };
        }

        const data = await response.json();
        return {
            success: true,
            data,
        };
    } catch (error: unknown) {
        let errorMessage: string;

        if (error instanceof Error) {
            errorMessage = error.message
        } else {
            errorMessage = String(error);
        }

        return {
            success: false,
            error: errorMessage,
        }
    }
    
}