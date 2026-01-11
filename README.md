# On-Page SEO Analyzer

A web application that provides structured on-page SEO analytics and AI-powered improvement suggestions for any website URL. Powered by Google's Gemini 1.5 Pro model.

## Features

- **URL Analysis**: Paste any website URL to analyze its SEO metrics
- **Structured Analytics**: Get detailed metrics including:
  - Word count
  - Title tag content and length
  - Meta description content and length
  - Heading counts (H1, H2, H3)
  - Image count and missing alt attributes
  - Internal and external link counts
- **AI-Powered Suggestions**: Receive actionable SEO recommendations
  - Overall SEO score (out of 100)
  - Prioritized improvement checklist
  - Creative blog post ideas based on content gaps

## Tech Stack

- **Backend**: Node.js with Express
- **Frontend**: HTML, CSS, JavaScript
- **AI**: Google Gemini 1.5 Pro
- **Web Scraping**: Axios + Cheerio

## Quick Start

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your Gemini API key:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` in your browser

## Development

```bash
npm run dev  # Start with auto-reload
```

## API Key

Get your Gemini API key from: https://aistudio.google.com/apikey

## License

MIT
