/**
 * Brightloop API Client
 * Wraps fetch requests to the backend server with JSON headers,
 * automatic JWT authorization, and normalized error throwing.
 */
const BASE_URL = 'http://localhost:5000/api';

export async function api(path, options = {}) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${BASE_URL}${normalizedPath}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const token = localStorage.getItem('token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  // Automatically serialize object bodies to JSON string
  if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(url, config);

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json().catch(() => null);
  } else {
    data = await response.text().catch(() => null);
  }

  if (!response.ok) {
    const errorMessage =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status} (${response.statusText})`;
    throw new Error(errorMessage);
  }

  return data;
}

export default api;
