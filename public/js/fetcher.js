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
};

export default fetcher;
