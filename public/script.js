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

// Export to PDF function
function exportToPDF() {
    if (!lastAnalysisData || !lastAnalyzedUrl) {
        alert('No analysis data available to export.');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { analytics, aiSuggestions } = lastAnalysisData;

    // Configuration
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const contentWidth = pageWidth - (margin * 2);
    const lineHeight = 7;
    let y = margin;

    // Helper: Check and add new page if needed
    function checkPage(needed = 20) {
        if (y + needed > pageHeight - 30) {
            doc.addPage();
            y = margin;
            return true;
        }
        return false;
    }

    // Helper: Sanitize text (remove problematic characters for PDF)
    function sanitize(text) {
        if (!text) return 'N/A';
        // Replace non-ASCII with placeholder or remove
        return String(text).replace(/[^\x00-\x7F]/g, '?');
    }

    // Helper: Add section title
    function addSection(title) {
        checkPage(25);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 123, 255);
        doc.text(title, margin, y);
        y += 3;
        doc.setDrawColor(0, 123, 255);
        doc.setLineWidth(0.5);
        doc.line(margin, y, margin + 50, y);
        y += lineHeight + 3;
    }

    // Helper: Add key-value row
    function addRow(label, value) {
        checkPage(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(label + ':', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);
        doc.text(sanitize(String(value)), margin + 60, y);
        y += lineHeight;
    }

    // Helper: Add wrapped text
    function addWrappedText(text, indent = 0) {
        const maxWidth = contentWidth - indent;
        const lines = doc.splitTextToSize(sanitize(text), maxWidth);
        lines.forEach(line => {
            checkPage(10);
            doc.text(line, margin + indent, y);
            y += lineHeight - 1;
        });
    }

    // ============ HEADER ============
    doc.setFillColor(0, 123, 255);
    doc.rect(0, 0, pageWidth, 35, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('SEO Analysis Report', margin, 22);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated by On-Page SEO Analyzer', margin, 30);

    y = 50;

    // ============ REPORT INFO ============
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('URL:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 123, 255);

    // Truncate long URLs
    const displayUrl = lastAnalyzedUrl.length > 60
        ? lastAnalyzedUrl.substring(0, 60) + '...'
        : lastAnalyzedUrl;
    doc.text(displayUrl, margin + 15, y);
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Date:', margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(new Date().toLocaleString('en-US'), margin + 15, y);
    y += lineHeight + 5;

    // ============ SEO SCORE ============
    if (aiSuggestions && aiSuggestions.score !== null) {
        checkPage(30);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, y, contentWidth, 25, 3, 3, 'F');

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('SEO Score:', margin + 5, y + 10);

        const score = aiSuggestions.score;
        if (score >= 80) doc.setTextColor(40, 167, 69);
        else if (score >= 60) doc.setTextColor(255, 193, 7);
        else doc.setTextColor(220, 53, 69);

        doc.setFontSize(24);
        doc.text(score + '/100', margin + 45, y + 12);

        if (aiSuggestions.explanation) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont('helvetica', 'normal');
            const expLines = doc.splitTextToSize(sanitize(aiSuggestions.explanation), contentWidth - 100);
            doc.text(expLines, margin + 90, y + 8);
        }

        y += 35;
    }

    // ============ ANALYTICS ============
    addSection('Page Analytics');

    addRow('Word Count', analytics.wordCount.toLocaleString());
    addRow('Title Length', analytics.titleLength + ' characters');
    addRow('Meta Desc Length', analytics.metaDescriptionLength + ' characters');
    addRow('H1 Tags', analytics.h1Count);
    addRow('H2 Tags', analytics.h2Count);
    addRow('H3 Tags', analytics.h3Count);
    addRow('Images', analytics.imageCount);
    addRow('Missing Alt Text', analytics.imagesWithoutAlt);
    addRow('Internal Links', analytics.internalLinks);
    addRow('External Links', analytics.externalLinks);

    y += 5;

    // Page Title
    checkPage(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Page Title:', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    addWrappedText(analytics.title || 'Not found');
    y += 5;

    // Meta Description
    checkPage(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text('Meta Description:', margin, y);
    y += lineHeight;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    addWrappedText(analytics.metaDescription || 'Not found');
    y += 10;

    // ============ SUGGESTIONS ============
    if (aiSuggestions && aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0) {
        addSection('Improvement Suggestions');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);

        aiSuggestions.suggestions.forEach((suggestion, i) => {
            checkPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 123, 255);
            doc.text((i + 1) + '.', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);

            const lines = doc.splitTextToSize(sanitize(suggestion), contentWidth - 15);
            lines.forEach((line, lineIdx) => {
                if (lineIdx > 0) checkPage(8);
                doc.text(line, margin + 10, y);
                y += lineHeight - 1;
            });
            y += 3;
        });
    }

    // ============ BLOG IDEAS ============
    if (aiSuggestions && aiSuggestions.blogIdeas && aiSuggestions.blogIdeas.length > 0) {
        y += 5;
        addSection('Blog Post Ideas');

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(40, 40, 40);

        aiSuggestions.blogIdeas.forEach((idea, i) => {
            checkPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 123, 255);
            doc.text((i + 1) + '.', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(40, 40, 40);

            const lines = doc.splitTextToSize(sanitize(idea), contentWidth - 15);
            lines.forEach((line, lineIdx) => {
                if (lineIdx > 0) checkPage(8);
                doc.text(line, margin + 10, y);
                y += lineHeight - 1;
            });
            y += 3;
        });
    }

    // ============ FOOTER ============
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
            'Page ' + i + ' of ' + totalPages + ' | On-Page SEO Analyzer',
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
        );
    }

    // Save PDF
    let filename = 'seo-report';
    try {
        const host = new URL(lastAnalyzedUrl).hostname.replace(/\./g, '-');
        filename = 'seo-report-' + host;
    } catch (e) {}

    doc.save(filename + '.pdf');
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
