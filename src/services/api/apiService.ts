/**
 * Generic API service for handling backend requests
 */
export interface ApiService {
  /**
   * Make a GET request to the API
   */
  get<T>(endpoint: string, params?: Record<string, any>): Promise<T>;
  
  /**
   * Make a POST request to the API
   */
  post<T>(endpoint: string, data: any): Promise<T>;
  
  /**
   * Make a PUT request to the API
   */
  put<T>(endpoint: string, data: any): Promise<T>;
  
  /**
   * Make a DELETE request to the API
   */
  delete<T>(endpoint: string): Promise<T>;

  /**
   * Set the auth token for API requests
   */
  setAuthToken(token: string | null): void;
}

/**
 * Mock implementation of the API service
 */
class MockApiService implements ApiService {
  private authToken: string | null = null;

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    console.log('Mock GET request:', { endpoint, params });
    throw new Error('Not implemented');
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    console.log('Mock POST request:', { endpoint, data });
    throw new Error('Not implemented');
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    console.log('Mock PUT request:', { endpoint, data });
    throw new Error('Not implemented');
  }

  async delete<T>(endpoint: string): Promise<T> {
    console.log('Mock DELETE request:', { endpoint });
    throw new Error('Not implemented');
  }

  setAuthToken(token: string | null): void {
    console.log('Setting auth token:', token ? '(token)' : 'null');
    this.authToken = token;
  }
}

export const apiService = new MockApiService(); 