// Store the last analysis data for PDF export
let lastAnalysisData = null;
let lastAnalyzedUrl = null;

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

        // Store data for PDF export
        lastAnalysisData = data;
        lastAnalyzedUrl = processedUrl;

        // Save to history
        addToHistory(processedUrl, data);

        // Hide history section if visible
        document.getElementById('historySection').style.display = 'none';
        document.getElementById('historyBtn').classList.remove('active');

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

// Export to PDF function using html2pdf (supports Chinese/Unicode characters)
function exportToPDF() {
    if (!lastAnalysisData || !lastAnalyzedUrl) {
        alert('No analysis data available to export.');
        return;
    }

    const { analytics, aiSuggestions } = lastAnalysisData;
    const score = aiSuggestions?.score;
    const scoreColor = score >= 80 ? '#28a745' : score >= 60 ? '#ffc107' : '#dc3545';

    // Create HTML content for PDF
    const htmlContent = `
        <div style="font-family: 'Microsoft JhengHei', 'PingFang TC', 'Noto Sans TC', Arial, sans-serif; color: #333; padding: 20px; max-width: 800px;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #007BFF, #00d4ff); color: white; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <h1 style="margin: 0 0 5px 0; font-size: 24px;">SEO Analysis Report</h1>
                <p style="margin: 0; opacity: 0.9; font-size: 12px;">Generated by On-Page SEO Analyzer</p>
            </div>

            <!-- URL & Date -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0;"><strong>URL:</strong> <span style="color: #007BFF; word-break: break-all;">${lastAnalyzedUrl}</span></p>
                <p style="margin: 0;"><strong>Date:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <!-- SEO Score -->
            ${score !== null ? `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 25px; display: flex; align-items: center;">
                <div style="background: ${scoreColor}; color: white; width: 80px; height: 80px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; margin-right: 20px;">
                    <span style="font-size: 28px; font-weight: bold;">${score}</span>
                    <span style="font-size: 10px;">/100</span>
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0 0 5px 0; color: #333;">SEO Score</h3>
                    <p style="margin: 0; color: #666; font-size: 13px;">${aiSuggestions?.explanation || ''}</p>
                </div>
            </div>
            ` : ''}

            <!-- Analytics -->
            <h2 style="color: #007BFF; border-bottom: 2px solid #007BFF; padding-bottom: 8px; margin-bottom: 15px;">Page Analytics</h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Word Count</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.wordCount.toLocaleString()}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Title Length</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.titleLength} chars</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Meta Desc Length</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.metaDescriptionLength} chars</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>H1 Tags</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.h1Count}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>H2 Tags</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.h2Count}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>H3 Tags</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.h3Count}</td>
                </tr>
                <tr>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Images</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.imageCount}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Missing Alt</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.imagesWithoutAlt}</td>
                </tr>
                <tr style="background: #f8f9fa;">
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>Internal Links</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.internalLinks}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;"><strong>External Links</strong></td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${analytics.externalLinks}</td>
                </tr>
            </table>

            <!-- Page Title -->
            <div style="margin-bottom: 15px;">
                <strong style="color: #555;">Page Title:</strong>
                <p style="margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; word-break: break-word;">${analytics.title || 'Not found'}</p>
            </div>

            <!-- Meta Description -->
            <div style="margin-bottom: 25px;">
                <strong style="color: #555;">Meta Description:</strong>
                <p style="margin: 5px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; word-break: break-word;">${analytics.metaDescription || 'Not found'}</p>
            </div>

            <!-- Suggestions -->
            ${aiSuggestions?.suggestions?.length ? `
            <h2 style="color: #007BFF; border-bottom: 2px solid #007BFF; padding-bottom: 8px; margin-bottom: 15px;">Improvement Suggestions</h2>
            <ol style="padding-left: 20px; margin-bottom: 25px;">
                ${aiSuggestions.suggestions.map(s => `<li style="margin-bottom: 10px; line-height: 1.6;">${s}</li>`).join('')}
            </ol>
            ` : ''}

            <!-- Blog Ideas -->
            ${aiSuggestions?.blogIdeas?.length ? `
            <h2 style="color: #007BFF; border-bottom: 2px solid #007BFF; padding-bottom: 8px; margin-bottom: 15px;">Blog Post Ideas</h2>
            <ol style="padding-left: 20px; margin-bottom: 25px;">
                ${aiSuggestions.blogIdeas.map(idea => `<li style="margin-bottom: 10px; line-height: 1.6;">${idea}</li>`).join('')}
            </ol>
            ` : ''}

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 11px;">
                Generated by On-Page SEO Analyzer | ${new Date().toLocaleDateString()}
            </div>
        </div>
    `;

    // Create temporary element
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    document.body.appendChild(element);

    // Generate filename
    let filename = 'seo-report';
    try {
        const host = new URL(lastAnalyzedUrl).hostname.replace(/\./g, '-');
        filename = 'seo-report-' + host;
    } catch (e) {}

    // PDF options
    const opt = {
        margin: 10,
        filename: filename + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false
        },
        jsPDF: {
            unit: 'mm',
            format: 'a4',
            orientation: 'portrait'
        }
    };

    // Generate PDF
    html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
    });
}

// ==================== HISTORY FUNCTIONS ====================

const HISTORY_KEY = 'seo_analysis_history';
const MAX_HISTORY = 10;

// Load history from localStorage
function loadHistory() {
    try {
        const history = localStorage.getItem(HISTORY_KEY);
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('Error loading history:', e);
        return [];
    }
}

// Save history to localStorage
function saveHistory(history) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (e) {
        console.error('Error saving history:', e);
    }
}

// Add analysis to history
function addToHistory(url, data) {
    const history = loadHistory();

    const entry = {
        id: Date.now(),
        url: url,
        date: new Date().toISOString(),
        score: data.aiSuggestions?.score || null,
        data: data
    };

    // Add to beginning of array
    history.unshift(entry);

    // Keep only last MAX_HISTORY entries
    if (history.length > MAX_HISTORY) {
        history.pop();
    }

    saveHistory(history);
    renderHistoryList();
}

// Toggle history section visibility
function toggleHistory() {
    const historySection = document.getElementById('historySection');
    const historyBtn = document.getElementById('historyBtn');
    const results = document.getElementById('results');

    if (historySection.style.display === 'none') {
        historySection.style.display = 'block';
        historyBtn.classList.add('active');
        results.style.display = 'none';
        renderHistoryList();
    } else {
        historySection.style.display = 'none';
        historyBtn.classList.remove('active');
    }
}

// Render history list
function renderHistoryList() {
    const historyList = document.getElementById('historyList');
    const history = loadHistory();

    if (history.length === 0) {
        historyList.innerHTML = '<p class="no-history">No analysis history yet.</p>';
        return;
    }

    historyList.innerHTML = history.map(entry => {
        const date = new Date(entry.date).toLocaleString();
        const scoreClass = getScoreClass(entry.score);
        const scoreDisplay = entry.score !== null ? `${entry.score}/100` : '--';

        return `
            <div class="history-item" data-id="${entry.id}">
                <div class="history-item-header">
                    <span class="history-item-url">${truncateText(entry.url, 50)}</span>
                    <span class="history-item-score ${scoreClass}">${scoreDisplay}</span>
                </div>
                <div class="history-item-date">${date}</div>
                <div class="history-item-actions">
                    <button class="history-view-btn" onclick="viewHistoryEntry(${entry.id})">View Results</button>
                    <button class="history-delete-btn" onclick="deleteHistoryEntry(${entry.id})">Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Get score class for styling
function getScoreClass(score) {
    if (score === null) return '';
    if (score >= 80) return 'score-high';
    if (score >= 60) return 'score-medium';
    return 'score-low';
}

// View a history entry
function viewHistoryEntry(id) {
    const history = loadHistory();
    const entry = history.find(h => h.id === id);

    if (entry && entry.data) {
        // Hide history section
        document.getElementById('historySection').style.display = 'none';
        document.getElementById('historyBtn').classList.remove('active');

        // Store data for PDF export
        lastAnalysisData = entry.data;
        lastAnalyzedUrl = entry.url;

        // Display the results
        displayResults(entry.data);

        // Update URL input
        document.getElementById('urlInput').value = entry.url;
    }
}

// Delete a history entry
function deleteHistoryEntry(id) {
    let history = loadHistory();
    history = history.filter(h => h.id !== id);
    saveHistory(history);
    renderHistoryList();
}

// Clear all history
function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem(HISTORY_KEY);
        renderHistoryList();
    }
}
