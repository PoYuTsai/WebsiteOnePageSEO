require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Analyze URL endpoint
app.post('/api/analyze', async (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        // Validate URL format
        new URL(url);
    } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        // Fetch the webpage
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Extract SEO metrics
        const analytics = extractAnalytics($, url);

        // Get AI suggestions
        const aiSuggestions = await getAISuggestions(analytics, url);

        res.json({
            success: true,
            analytics,
            aiSuggestions
        });

    } catch (error) {
        console.error('Analysis error:', error.message);

        if (error.code === 'ENOTFOUND') {
            return res.status(400).json({ error: 'Website not found. Please check the URL.' });
        }
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
            return res.status(400).json({ error: 'Request timed out. The website may be slow or unavailable.' });
        }

        res.status(500).json({ error: 'Failed to analyze the website. Please try again.' });
    }
});

function extractAnalytics($, url) {
    // Get page text content
    const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
    const wordCount = bodyText.split(/\s+/).filter(word => word.length > 0).length;

    // Title tag
    const title = $('title').text().trim();
    const titleLength = title.length;

    // Meta description
    const metaDescription = $('meta[name="description"]').attr('content') || '';
    const metaDescriptionLength = metaDescription.length;

    // Headings
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;

    // Images
    const images = $('img');
    const imageCount = images.length;
    let imagesWithoutAlt = 0;
    images.each((_, img) => {
        const alt = $(img).attr('alt');
        if (!alt || alt.trim() === '') {
            imagesWithoutAlt++;
        }
    });

    // Links
    const baseUrl = new URL(url);
    const links = $('a[href]');
    let internalLinks = 0;
    let externalLinks = 0;

    links.each((_, link) => {
        const href = $(link).attr('href');
        if (href) {
            try {
                const linkUrl = new URL(href, url);
                if (linkUrl.hostname === baseUrl.hostname) {
                    internalLinks++;
                } else if (linkUrl.protocol.startsWith('http')) {
                    externalLinks++;
                }
            } catch {
                // Relative links count as internal
                if (!href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
                    internalLinks++;
                }
            }
        }
    });

    return {
        wordCount,
        title,
        titleLength,
        metaDescription,
        metaDescriptionLength,
        h1Count,
        h2Count,
        h3Count,
        imageCount,
        imagesWithoutAlt,
        internalLinks,
        externalLinks
    };
}

async function getAISuggestions(analytics, url) {
    if (!process.env.GEMINI_API_KEY) {
        return {
            score: null,
            explanation: 'Gemini API key not configured',
            suggestions: ['Configure GEMINI_API_KEY in .env file to enable AI suggestions'],
            blogIdeas: []
        };
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });

    const prompt = `You are an SEO expert. Analyze the following on-page SEO metrics for the URL: ${url}

SEO Metrics:
- Word Count: ${analytics.wordCount}
- Title: "${analytics.title}" (${analytics.titleLength} characters)
- Meta Description: "${analytics.metaDescription}" (${analytics.metaDescriptionLength} characters)
- H1 Tags: ${analytics.h1Count}
- H2 Tags: ${analytics.h2Count}
- H3 Tags: ${analytics.h3Count}
- Total Images: ${analytics.imageCount}
- Images Missing Alt Text: ${analytics.imagesWithoutAlt}
- Internal Links: ${analytics.internalLinks}
- External Links: ${analytics.externalLinks}

Provide your response in the following JSON format only (no markdown, no code blocks):
{
    "score": <number 0-100>,
    "explanation": "<brief 1-2 sentence explanation of the score>",
    "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>", "<suggestion 4>", "<suggestion 5>"],
    "blogIdeas": ["<blog idea 1>", "<blog idea 2>"]
}

Base your score and suggestions on SEO best practices:
- Title should be 50-60 characters
- Meta description should be 150-160 characters
- Page should have exactly 1 H1 tag
- All images should have alt text
- Good content length is 1000+ words
- Balance of internal and external links`;

    try {
        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();

        // Parse JSON response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        throw new Error('Invalid response format');
    } catch (error) {
        console.error('AI suggestion error:', error.message);
        return {
            score: null,
            explanation: 'Unable to generate AI suggestions',
            suggestions: ['AI analysis temporarily unavailable'],
            blogIdeas: []
        };
    }
}

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
