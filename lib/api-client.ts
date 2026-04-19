interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function fetchWithError<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.error || 'Request failed',
        data.code,
        response.status
      );
    }

    if (!data.success) {
      throw new ApiError(data.error || 'Request failed', data.code);
    }

    return data.data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Network error or invalid response');
  }
}

export { ApiError };
