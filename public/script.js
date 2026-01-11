async function analyzeURL() {
    const urlInput = document.getElementById('urlInput');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const btnText = analyzeBtn.querySelector('.btn-text');
    const btnLoader = analyzeBtn.querySelector('.btn-loader');
    const errorMessage = document.getElementById('errorMessage');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const results = document.getElementById('results');

    const url = urlInput.value.trim();

    // Clear previous errors
    errorMessage.textContent = '';

    // Validate URL
    if (!url) {
        errorMessage.textContent = 'Please enter a URL';
        return;
    }

    // Add protocol if missing
    let processedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        processedUrl = 'https://' + url;
    }

    try {
        new URL(processedUrl);
    } catch {
        errorMessage.textContent = 'Please enter a valid URL';
        return;
    }

    // Update UI for loading state
    btnText.style.display = 'none';
    btnLoader.style.display = 'block';
    analyzeBtn.disabled = true;
    loadingIndicator.style.display = 'block';
    results.style.display = 'none';

    try {
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: processedUrl })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Analysis failed');
        }

        displayResults(data);

    } catch (error) {
        errorMessage.textContent = error.message;
    } finally {
        btnText.style.display = 'block';
        btnLoader.style.display = 'none';
        analyzeBtn.disabled = false;
        loadingIndicator.style.display = 'none';
    }
}

function displayResults(data) {
    const results = document.getElementById('results');
    const analyticsGrid = document.getElementById('analyticsGrid');
    const scoreValue = document.getElementById('scoreValue');
    const scoreExplanation = document.getElementById('scoreExplanation');
    const suggestionsList = document.getElementById('suggestionsList');
    const blogIdeasList = document.getElementById('blogIdeasList');

    const { analytics, aiSuggestions } = data;

    // Build analytics grid
    analyticsGrid.innerHTML = `
        <div class="metric-card">
            <div class="metric-label">Word Count</div>
            <div class="metric-value ${getWordCountClass(analytics.wordCount)}">${analytics.wordCount.toLocaleString()}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Title Tag</div>
            <div class="metric-value ${getTitleClass(analytics.titleLength)}">${analytics.titleLength} chars</div>
            <div class="metric-detail">${truncateText(analytics.title, 50)}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Meta Description</div>
            <div class="metric-value ${getMetaDescClass(analytics.metaDescriptionLength)}">${analytics.metaDescriptionLength} chars</div>
            <div class="metric-detail">${truncateText(analytics.metaDescription, 50) || 'Not found'}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">H1 Tags</div>
            <div class="metric-value ${getH1Class(analytics.h1Count)}">${analytics.h1Count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">H2 Tags</div>
            <div class="metric-value">${analytics.h2Count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">H3 Tags</div>
            <div class="metric-value">${analytics.h3Count}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Images</div>
            <div class="metric-value">${analytics.imageCount}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Images Missing Alt</div>
            <div class="metric-value ${analytics.imagesWithoutAlt > 0 ? 'warning' : 'success'}">${analytics.imagesWithoutAlt}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Internal Links</div>
            <div class="metric-value">${analytics.internalLinks}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">External Links</div>
            <div class="metric-value">${analytics.externalLinks}</div>
        </div>
    `;

    // Display AI suggestions
    if (aiSuggestions.score !== null) {
        scoreValue.textContent = aiSuggestions.score;
        document.querySelector('.score-circle').style.borderColor = getScoreColor(aiSuggestions.score);
        scoreValue.style.color = getScoreColor(aiSuggestions.score);
    } else {
        scoreValue.textContent = '--';
    }

    scoreExplanation.textContent = aiSuggestions.explanation || '';

    suggestionsList.innerHTML = aiSuggestions.suggestions
        .map(suggestion => `<li>${suggestion}</li>`)
        .join('');

    blogIdeasList.innerHTML = aiSuggestions.blogIdeas
        .map(idea => `<li>${idea}</li>`)
        .join('');

    results.style.display = 'block';
}

function getWordCountClass(count) {
    if (count >= 1000) return 'success';
    if (count >= 500) return 'warning';
    return 'danger';
}

function getTitleClass(length) {
    if (length >= 50 && length <= 60) return 'success';
    if (length > 0 && length < 70) return 'warning';
    return 'danger';
}

function getMetaDescClass(length) {
    if (length >= 150 && length <= 160) return 'success';
    if (length > 0 && length < 200) return 'warning';
    return 'danger';
}

function getH1Class(count) {
    if (count === 1) return 'success';
    if (count > 1) return 'warning';
    return 'danger';
}

function getScoreColor(score) {
    if (score >= 80) return '#28a745';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
}

function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Allow Enter key to trigger analysis
document.getElementById('urlInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        analyzeURL();
    }
});
