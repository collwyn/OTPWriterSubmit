import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  formData?: FormData,
): Promise<Response> {
  // Use FormData if provided (for file uploads)
  if (formData) {
    const res = await fetch(url, {
      method,
      body: formData,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  }

  // Regular JSON requests
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle array query keys like ['/api/articles', id]
    let url = queryKey[0] as string;
    if (queryKey.length > 1 && typeof queryKey[1] !== 'undefined') {
      // If the second item exists and isn't a fetch option, append it to the URL
      // This handles cases like ['/api/articles', '123'] => '/api/articles/123'
      url = `${url}/${queryKey[1]}`;
      console.log(`QueryClient: Transformed query key ${JSON.stringify(queryKey)} to URL: ${url}`);
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    console.log(`QueryClient: Fetch response for ${url} status:`, res.status);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    const data = await res.json();
    console.log(`QueryClient: Received data for ${url}:`, 
      typeof data === 'object' ? { 
        type: Array.isArray(data) ? 'array' : 'object',
        dataProperties: Object.keys(data || {}),
        contentIncluded: data && 'content' in data,
        contentLength: data && data.content ? data.content.length : 0
      } : typeof data);
    return data;
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
