// Handle 401 errors by redirecting to login
function handleUnauthorized(response) {
  if (response.status === 401) {
    window.location.href = "/login.html";
    throw new Error("Unauthorized");
  }
  return response;
}

const fetcher = {
  get: async (url) => {
    const response = await fetch(url);
    handleUnauthorized(response);

    if (!response.ok) {
      throw new Error("Failed to send GET request.");
    }

    return response.json();
  },
  post: async (url, data) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    handleUnauthorized(response);

    if (!response.ok) {
      throw new Error("Failed to send POST request.");
    }

    return response.json();
  },
  patch: async (url, data) => {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    handleUnauthorized(response);

    if (!response.ok) {
      throw new Error("Failed to send PATCH request.");
    }

    return response.json();
  },
  delete: async (url) => {
    const response = await fetch(url, {
      method: "DELETE",
    });
    handleUnauthorized(response);

    if (!response.ok) {
      throw new Error("Failed to send DELETE request.");
    }

    return response;
  },
};

export default fetcher;
