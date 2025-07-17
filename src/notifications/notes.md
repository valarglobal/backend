┌────────────────────────────┐
│      User Inputs Topic     │
│ (e.g,"fundraising Africa")│
└────────────┬───────────────┘
             │
             ▼
┌────────────────────────────┐
│   Google Programmable      │
│      Search API (CSE)      │
│   (search relevant URLs)   │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│      Extract URLs List     │
│  (Top 5 articles returned) │
└────────────┬───────────────┘
           ---▼--- Advanced Implementation.
┌────────────────────────────┐
│      Scrape Each URL       │
│  (Axios + Cheerio)         │
│  Extract paragraphs/text   │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│   Send Text + Topic to AI  │
│   (OpenAI: GPT-4 )
│  Generate 150-word summary │
└────────────┬───────────────┘
             ▼
┌────────────────────────────┐
│     Return JSON Results    │
│ [title, url, summary]      │
└────────────────────────────┘
