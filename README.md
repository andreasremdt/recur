# Memrise

A simple Bun project with a web server, SQLite database, and API endpoint.

## Requirements

- [Bun](https://bun.sh) v1.0 or later

## Getting Started

```bash
# Start the development server (with hot reload)
bun run dev

# Or start without hot reload
bun run start
```

The server will start at http://localhost:3000

## Features

- **Static file serving**: Serves `index.html` at the root path
- **SQLite database**: Uses Bun's built-in SQLite support (creates `app.db`)
- **API endpoint**: `/api/hello` returns `{ "message": "Hello World" }`

## Project Structure

```
memrise/
├── index.ts      # Main server file
├── index.html    # Frontend HTML
├── package.json  # Project configuration
└── README.md     # This file
```
