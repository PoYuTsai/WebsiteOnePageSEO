# CLAUDE.md - On-Page SEO Analyzer

> **Documentation Version**: 1.0
> **Last Updated**: 2026-01-12
> **Project**: On-Page SEO Analyzer
> **Description**: Web application providing structured on-page SEO analytics and AI-powered improvement suggestions using Google Gemini 1.5 Pro
> **Features**: GitHub auto-backup, Task agents, technical debt prevention

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL RULES - READ FIRST

> **RULE ADHERENCE SYSTEM ACTIVE**
> **Claude Code must explicitly acknowledge these rules at task start**

### RULE ACKNOWLEDGMENT REQUIRED
> **Before starting ANY task, Claude Code must respond with:**
> "CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ABSOLUTE PROHIBITIONS
- **NEVER** create new files in root directory - use proper module structure (src/, public/)
- **NEVER** write output files directly to root directory - use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands - use Read, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.js, enhanced_xyz.js, utils_new.js) - ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept - single source of truth
- **NEVER** copy-paste code blocks - extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable - use .env file
- **NEVER** use naming like enhanced_, improved_, new_, v2_ - extend original files instead

### MANDATORY REQUIREMENTS
- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit: `git push origin main`
- **USE TASK AGENTS** for all long-running operations (>30 seconds)
- **TODOWRITE** for complex tasks (3+ steps)
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept

## PROJECT STRUCTURE

```
onesite-page-seo/
├── CLAUDE.md              # This file - rules for Claude Code
├── README.md              # Project documentation
├── package.json           # Node.js dependencies
├── .gitignore             # Git ignore patterns
├── .env.example           # Environment variable template
├── src/
│   └── server.js          # Express backend server
└── public/
    ├── index.html         # Frontend HTML
    ├── style.css          # Styles (dark theme)
    └── script.js          # Frontend JavaScript
```

## TECH STACK

- **Backend**: Node.js + Express
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **AI**: Google Gemini 1.5 Pro
- **Web Scraping**: Axios + Cheerio

## COMMON COMMANDS

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## ENVIRONMENT SETUP

Create a `.env` file with:
```
GEMINI_API_KEY=your_api_key_here
PORT=3000
```

Get your API key from: https://aistudio.google.com/apikey

## API ENDPOINTS

- `POST /api/analyze` - Analyze a URL for SEO metrics
  - Body: `{ "url": "https://example.com" }`
  - Returns: `{ analytics: {...}, aiSuggestions: {...} }`

## MANDATORY PRE-TASK COMPLIANCE CHECK

> **STOP: Before starting any task, verify ALL points:**

**Step 1: Rule Acknowledgment**
- [ ] I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**
- [ ] Will this create files in root? - If YES, use proper module structure instead
- [ ] Will this take >30 seconds? - If YES, use Task agents not Bash
- [ ] Is this 3+ steps? - If YES, use TodoWrite breakdown first

**Step 3: Technical Debt Prevention**
- [ ] **SEARCH FIRST**: Use Grep to find existing implementations
- [ ] Does similar functionality already exist? - If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? - If YES, consolidate instead

## GITHUB BACKUP WORKFLOW

```bash
# After every commit, always run:
git push origin main
```

---

**Template by Chang Ho Chien | HC AI channel | v1.0.0**
Tutorial: https://youtu.be/8Q1bRZaHH24
