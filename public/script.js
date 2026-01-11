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

    // Colors
    const primaryBlue = [0, 123, 255];
    const darkGray = [45, 45, 45];
    const lightGray = [176, 176, 176];
    const white = [255, 255, 255];

    let yPos = 20;
    const leftMargin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 40;

    // Helper function to add new page if needed
    function checkNewPage(requiredSpace) {
        if (yPos + requiredSpace > 280) {
            doc.addPage();
            yPos = 20;
            return true;
        }
        return false;
    }

    // Header / Branding
    doc.setFillColor(...primaryBlue);
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(...white);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('On-Page SEO Analyzer', leftMargin, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Powered by Google Gemini AI', leftMargin, 34);

    yPos = 55;

    // URL and Date
    doc.setTextColor(...darkGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Website Analyzed:', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...primaryBlue);

    // Truncate URL if too long
    const maxUrlLength = 70;
    const displayUrl = lastAnalyzedUrl.length > maxUrlLength
        ? lastAnalyzedUrl.substring(0, maxUrlLength) + '...'
        : lastAnalyzedUrl;
    doc.text(displayUrl, leftMargin + 42, yPos);

    yPos += 8;
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text('Analysis Date:', leftMargin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...lightGray);
    doc.text(new Date().toLocaleString(), leftMargin + 35, yPos);

    yPos += 15;

    // Section: SEO Score
    if (aiSuggestions.score !== null) {
        doc.setFillColor(...primaryBlue);
        doc.rect(leftMargin, yPos, contentWidth, 30, 'F');

        doc.setTextColor(...white);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('SEO Score', leftMargin + 10, yPos + 12);

        doc.setFontSize(28);
        doc.text(`${aiSuggestions.score}/100`, leftMargin + 10, yPos + 26);

        // Score explanation on the right
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const explanationLines = doc.splitTextToSize(aiSuggestions.explanation || '', contentWidth - 80);
        doc.text(explanationLines, leftMargin + 80, yPos + 15);

        yPos += 40;
    }

    // Section: Structured Analytics
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Structured Analytics', leftMargin, yPos);
    yPos += 8;

    // Draw line under section title
    doc.setDrawColor(...primaryBlue);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, yPos, leftMargin + 60, yPos);
    yPos += 10;

    // Analytics metrics in a grid-like format
    const metrics = [
        { label: 'Word Count', value: analytics.wordCount.toLocaleString() },
        { label: 'Title Length', value: `${analytics.titleLength} chars` },
        { label: 'Meta Description Length', value: `${analytics.metaDescriptionLength} chars` },
        { label: 'H1 Tags', value: analytics.h1Count.toString() },
        { label: 'H2 Tags', value: analytics.h2Count.toString() },
        { label: 'H3 Tags', value: analytics.h3Count.toString() },
        { label: 'Total Images', value: analytics.imageCount.toString() },
        { label: 'Images Missing Alt', value: analytics.imagesWithoutAlt.toString() },
        { label: 'Internal Links', value: analytics.internalLinks.toString() },
        { label: 'External Links', value: analytics.externalLinks.toString() }
    ];

    doc.setFontSize(10);
    const colWidth = contentWidth / 2;

    for (let i = 0; i < metrics.length; i += 2) {
        checkNewPage(12);

        // Left column
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...lightGray);
        doc.text(metrics[i].label + ':', leftMargin, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text(metrics[i].value, leftMargin + 55, yPos);

        // Right column (if exists)
        if (metrics[i + 1]) {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...lightGray);
            doc.text(metrics[i + 1].label + ':', leftMargin + colWidth, yPos);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkGray);
            doc.text(metrics[i + 1].value, leftMargin + colWidth + 55, yPos);
        }

        yPos += 8;
    }

    // Title content
    yPos += 5;
    checkNewPage(20);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...lightGray);
    doc.text('Page Title:', leftMargin, yPos);
    doc.setTextColor(...darkGray);
    const titleLines = doc.splitTextToSize(analytics.title || 'Not found', contentWidth - 25);
    doc.text(titleLines, leftMargin + 25, yPos);
    yPos += titleLines.length * 5 + 5;

    // Meta description content
    checkNewPage(20);
    doc.setTextColor(...lightGray);
    doc.text('Meta Description:', leftMargin, yPos);
    yPos += 5;
    doc.setTextColor(...darkGray);
    const metaLines = doc.splitTextToSize(analytics.metaDescription || 'Not found', contentWidth);
    doc.text(metaLines, leftMargin, yPos);
    yPos += metaLines.length * 5 + 10;

    // Section: AI Suggestions
    checkNewPage(30);
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('AI-Powered Suggestions', leftMargin, yPos);
    yPos += 8;

    doc.setDrawColor(...primaryBlue);
    doc.line(leftMargin, yPos, leftMargin + 70, yPos);
    yPos += 10;

    // Improvement checklist
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Improvement Checklist:', leftMargin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (aiSuggestions.suggestions && aiSuggestions.suggestions.length > 0) {
        aiSuggestions.suggestions.forEach((suggestion, index) => {
            checkNewPage(15);
            doc.setTextColor(...primaryBlue);
            doc.text(`${index + 1}.`, leftMargin, yPos);
            doc.setTextColor(...darkGray);
            const suggestionLines = doc.splitTextToSize(suggestion, contentWidth - 10);
            doc.text(suggestionLines, leftMargin + 8, yPos);
            yPos += suggestionLines.length * 5 + 4;
        });
    }

    yPos += 5;

    // Blog Ideas
    checkNewPage(30);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Blog Post Ideas:', leftMargin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    if (aiSuggestions.blogIdeas && aiSuggestions.blogIdeas.length > 0) {
        aiSuggestions.blogIdeas.forEach((idea, index) => {
            checkNewPage(15);
            doc.setTextColor(...primaryBlue);
            doc.text(`${index + 1}.`, leftMargin, yPos);
            doc.setTextColor(...darkGray);
            const ideaLines = doc.splitTextToSize(idea, contentWidth - 10);
            doc.text(ideaLines, leftMargin + 8, yPos);
            yPos += ideaLines.length * 5 + 4;
        });
    } else {
        doc.setTextColor(...lightGray);
        doc.text('No blog ideas available.', leftMargin, yPos);
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(...lightGray);
        doc.text(
            `Generated by On-Page SEO Analyzer | Page ${i} of ${pageCount}`,
            pageWidth / 2,
            290,
            { align: 'center' }
        );
    }

    // Generate filename from URL
    let filename = 'seo-analysis';
    try {
        const urlObj = new URL(lastAnalyzedUrl);
        filename = `seo-analysis-${urlObj.hostname.replace(/\./g, '-')}`;
    } catch (e) {
        // Use default filename
    }

    // Save the PDF
    doc.save(`${filename}.pdf`);
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
