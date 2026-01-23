const fetcher = {
  get: async (url) => {
    const response = await fetch(url);

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

    if (!response.ok) {
      throw new Error("Failed to send PATCH request.");
    }

    return response.json();
  },
  delete: async (url) => {
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("Failed to send DELETE request.");
    }

    return response;
  },
};

export default fetcher;
