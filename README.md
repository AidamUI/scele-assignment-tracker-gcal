# 🎓 SCELE to Google Calendar Auto-Sync

> **Inspired by:** [SCELE Summary Chrome Extension] (https://chromewebstore.google.com/detail/gkejenggnbfacaomfddmpdedpjbjgabn?utm_source=item-share-cb) by **Erich** and **Yahya**. This project uses a similar approach to parse SCELE data, but implements direct web scraping instead of using the extension.

Automated system that syncs SCELE (Student Centered E-Learning Environment) assignments, quizzes, forums, and announcements to Google Calendar using GitHub Actions. Runs every 3 hours automatically.

## 🌟 Features

- ✅ **Automated Login**: Logs into SCELE via SSO authentication
- ✅ **Multi-Type Extraction**: Extracts assignments, quizzes, forums, and announcements
- ✅ **Smart Date Handling**: 
  - Uses deadlines for assignments/quizzes
  - For forums without deadlines: Creates TWO events
    - `[dateposted]` - When forum was created
    - `[lastpost]` - Most recent activity
- ✅ **Smart Sync**: Only updates calendar if data has changed (avoids duplicates)
- ✅ **Color-Coded Events**: 
  - 🔴 Red = Quiz
  - 🔵 Blue = Assignment
  - 🟡 Yellow = Forum
  - 🟣 Blueberry = Announcement
- ✅ **Clickable Links**: Each event includes direct link to SCELE page
- ✅ **Free Time Blocks**: Events marked as "free" (won't block your calendar)
- ✅ **Scheduled Automation**: Runs every 3 hours via GitHub Actions
- ✅ **Manual Trigger**: Can run on-demand from GitHub Actions tab

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions (Ubuntu)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Xvfb (Virtual Display) - Required for Chrome Extension│ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │           Playwright + Chromium                   │  │ │
│  │  │  ┌────────────────────────────────────────────┐  │  │ │
│  │  │  │  1. Login to SCELE (SSO)                   │  │  │ │
│  │  │  │  2. Navigate courses (2026/2027 only)      │  │  │ │
│  │  │  │  3. Extract assignments/quizzes/forums     │  │  │ │
│  │  │  │  4. Parse dates and deadlines              │  │  │ │
│  │  │  └────────────────────────────────────────────┘  │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │              Google Calendar API                        │ │
│  │  ┌──────────────────────────────────────────────────┐  │ │
│  │  │  1. Fetch existing events                        │  │ │
│  │  │  2. Compare with scraped data                    │  │ │
│  │  │  3. Delete outdated events                       │  │ │
│  │  │  4. Insert new/updated events                    │  │ │
│  │  └──────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 How It Works

### 1. **Browser Automation (Playwright)**
- Launches Chromium in non-headless mode (required for Chrome extensions)
- Uses Xvfb on Linux servers to provide virtual display
- Navigates to SCELE SSO login page
- Fills in credentials from environment variables
- Waits for successful authentication

### 2. **Data Extraction**
- Filters courses by academic year (2026/2027)
- For each course:
  - Extracts assignments with deadlines
  - Extracts quizzes with deadlines
  - Extracts forums (with or without deadlines)
  - Extracts announcements
- For forums without deadlines:
  - Navigates to forum page
  - Finds first post date (when forum started)
  - Finds last post date (most recent activity)
  - Creates two separate calendar events

### 3. **Date Parsing**
Handles multiple date formats:
- Moodle format: `"Monday, 9 September 2024, 11:59 PM"`
- Forum format: `"Wednesday, August 26, 2026 at 05:55 PM"`
- ISO format: Direct parsing via `new Date()`

### 4. **Smart Calendar Sync**
- Fetches all future events from target calendar
- Compares each SCELE item with existing events using signature matching
- Only updates if:
  - Event doesn't exist yet
  - Event details have changed (name, date, course)
- Deletes events that no longer exist in SCELE
- Inserts new events with proper formatting

### 5. **Event Creation**
Each calendar event includes:
- **Summary**: Event name with tags (`[dateposted]`, `[lastpost]` for forums)
- **Description**: Type, course name, and clickable link
- **Location**: Direct URL to SCELE page
- **Start/End**: 1-hour duration from deadline
- **Color**: Type-specific color coding
- **Transparency**: Marked as "free" (doesn't block calendar)

## 📊 Event Types

| Type | Color | Tag | Description |
|------|-------|-----|-------------|
| Assignment | 🔵 Blue | None | Regular assignments with deadlines |
| Quiz | 🔴 Red | None | Quizzes with deadlines |
| Forum (with deadline) | 🟡 Yellow | None | Forums with explicit deadlines |
| Forum (date posted) | 🟡 Yellow | `[dateposted]` | When forum was created |
| Forum (last post) | 🟡 Yellow | `[lastpost]` | Most recent forum activity |
| Announcement | 🟣 Blueberry | None | Course announcements |

## 🔐 Security

All sensitive information is protected:
- **Local**: `.env` and `service-account.json` (in `.gitignore`)
- **GitHub**: Stored as encrypted repository secrets
- **Code**: Uses environment variables, no hardcoded credentials

## 📅 Schedule

The automation runs:
- **Automatically**: Every 3 hours (`0 */3 * * *`)
- **Manually**: On-demand via GitHub Actions "Run workflow" button

## 🛠️ Tech Stack

- **Runtime**: Node.js 20
- **Browser Automation**: Playwright (Chromium)
- **Calendar API**: Google Calendar API (googleapis)
- **CI/CD**: GitHub Actions (Ubuntu runner)
- **Display**: Xvfb (X Virtual Framebuffer for headless Linux)

## 📦 Dependencies

```json
{
  "playwright": "^1.40.0",
  "googleapis": "^128.0.0",
  "dotenv": "^16.3.1"
}
```

## 🚀 Quick Start

See **[COMPLETE_SETUP.md](COMPLETE_SETUP.md)** for detailed setup instructions from start to finish.

### Prerequisites
- Node.js 20+
- Google Cloud Project with Calendar API enabled
- Service Account with calendar access
- GitHub account

### Basic Setup
1. Clone repository
2. Install dependencies: `npm install`
3. Configure `.env` with credentials
4. Add service account JSON
5. Share calendar with service account
6. Test locally: `npm start`
7. Push to GitHub and configure secrets

## 📖 Documentation

- **[COMPLETE_SETUP.md](COMPLETE_SETUP.md)** - Complete setup guide from scratch (Google Cloud → Local → GitHub)

## 🔍 Troubleshooting

### Authentication Issues
- Verify SCELE credentials in `.env`
- Test login manually on SCELE website
- Check if SSO page has changed

### Calendar Permission Errors
- Ensure service account email is shared with calendar
- Permission must be "Make changes to events"
- Verify calendar ID is correct

### No Events Appearing
- Check GitHub Actions logs for errors
- Verify calendar ID matches target calendar
- Ensure courses are from 2026/2027 academic year

### Browser/Extension Issues
- Xvfb must be running on Linux (handled by workflow)
- Extension not needed for direct scraping (current implementation)

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - Feel free to use and modify for your needs.

## 🙏 Acknowledgments

- **Erich & Yahya** - Creators of [SCELE Summary Chrome Extension](https://chromewebstore.google.com/detail/gkejenggnbfacaomfddmpdedpjbjgabn?utm_source=item-share-cb)
- **SCELE** - UI's learning management system
- **Google Calendar API** - Calendar integration
- **Playwright** - Browser automation framework

## 📧 Support

For issues or questions:
1. Check [COMPLETE_SETUP.md](COMPLETE_SETUP.md) for detailed troubleshooting
2. Review GitHub Actions logs
3. Open an issue on GitHub

---

**made by aidam**