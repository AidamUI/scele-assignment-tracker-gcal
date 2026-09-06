import { chromium } from 'playwright';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const SCELE_USERNAME = process.env.SCELE_USERNAME;
const SCELE_PASSWORD = process.env.SCELE_PASSWORD;
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const EXTENSION_PATH = process.env.EXTENSION_PATH || './extension';

// Validate required environment variables
if (!SCELE_USERNAME || !SCELE_PASSWORD) {
  console.error('❌ Error: SCELE_USERNAME and SCELE_PASSWORD must be set');
  process.exit(1);
}

if (!GOOGLE_CALENDAR_ID) {
  console.error('❌ Error: GOOGLE_CALENDAR_ID must be set');
  process.exit(1);
}

if (!GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ Error: GOOGLE_APPLICATION_CREDENTIALS must be set');
  process.exit(1);
}

/**
 * Initialize Google Calendar API client
 */
async function initializeGoogleCalendar() {
  try {
    console.log('🔐 Initializing Google Calendar API...');
    
    const credentialsPath = path.resolve(__dirname, GOOGLE_APPLICATION_CREDENTIALS);
    const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/calendar'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    console.log('✅ Google Calendar API initialized');
    
    return calendar;
  } catch (error) {
    console.error('❌ Failed to initialize Google Calendar API:', error.message);
    throw error;
  }
}

/**
 * Delete all future events from the calendar
 */
async function clearFutureEvents(calendar) {
  try {
    console.log('🗑️  Fetching future events to clear...');
    
    const now = new Date().toISOString();
    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: now,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500, // Maximum allowed by API
    });

    const events = response.data.items || [];
    console.log(`📋 Found ${events.length} future events to delete`);

    if (events.length === 0) {
      console.log('✅ No future events to delete');
      return;
    }

    // Delete events in batches
    let deletedCount = 0;
    for (const event of events) {
      try {
        await calendar.events.delete({
          calendarId: GOOGLE_CALENDAR_ID,
          eventId: event.id,
        });
        deletedCount++;
      } catch (error) {
        console.warn(`⚠️  Failed to delete event ${event.id}:`, error.message);
      }
    }

    console.log(`✅ Deleted ${deletedCount} future events`);
  } catch (error) {
    console.error('❌ Failed to clear future events:', error.message);
    throw error;
  }
}

/**
 * Insert events into Google Calendar
 */
async function insertEvents(calendar, events) {
  try {
    console.log(`📅 Inserting ${events.length} events into calendar...`);
    
    let insertedCount = 0;
    let failedCount = 0;

    for (const event of events) {
      try {
        // Parse the event data
        const eventData = {
          summary: event.title || event.name || 'SCELE Assignment',
          description: event.description || event.course || '',
          start: {
            dateTime: new Date(event.deadline || event.dueDate).toISOString(),
            timeZone: 'Asia/Jakarta',
          },
          end: {
            dateTime: new Date(new Date(event.deadline || event.dueDate).getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
            timeZone: 'Asia/Jakarta',
          },
          colorId: event.type === 'quiz' ? '11' : event.type === 'forum' ? '5' : '1', // Red for quiz, Yellow for forum, Blue for assignment
        };

        await calendar.events.insert({
          calendarId: GOOGLE_CALENDAR_ID,
          requestBody: eventData,
        });

        insertedCount++;
        console.log(`  ✓ Inserted: ${eventData.summary}`);
      } catch (error) {
        failedCount++;
        console.warn(`  ✗ Failed to insert event:`, error.message);
      }
    }

    console.log(`✅ Successfully inserted ${insertedCount} events (${failedCount} failed)`);
  } catch (error) {
    console.error('❌ Failed to insert events:', error.message);
    throw error;
  }
}

/**
 * Launch browser with extension and extract SCELE data
 */
async function extractSceleData() {
  let browser = null;
  let context = null;

  try {
    console.log('🚀 Launching browser with extension...');
    
    const extensionPath = path.resolve(__dirname, EXTENSION_PATH);
    console.log(`📦 Extension path: ${extensionPath}`);

    // Launch browser with extension
    browser = await chromium.launch({
      headless: false, // Must be false for extensions
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    // Create persistent context
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    });

    const page = await context.newPage();

    console.log('🔐 Navigating to SCELE login page...');
    await page.goto('https://scele.cs.ui.ac.id/login/index.php', {
      waitUntil: 'networkidle',
      timeout: 60000,
    });

    // Wait for CAS SSO login form
    console.log('⏳ Waiting for CAS SSO login form...');
    await page.waitForSelector('input[name="username"]', { timeout: 30000 });
    await page.waitForSelector('input[name="password"]', { timeout: 30000 });

    console.log('📝 Filling in credentials...');
    await page.fill('input[name="username"]', SCELE_USERNAME);
    await page.fill('input[name="password"]', SCELE_PASSWORD);

    console.log('🔑 Submitting login form...');
    await page.click('button[type="submit"], input[type="submit"]');

    // Wait for redirect to SCELE dashboard
    console.log('⏳ Waiting for redirect to SCELE dashboard...');
    await page.waitForURL('**/scele.cs.ui.ac.id/**', {
      timeout: 60000,
      waitUntil: 'networkidle',
    });

    console.log('✅ Successfully logged in to SCELE');

    // Wait for extension to process the page
    console.log('⏳ Waiting for extension to extract data...');
    await page.waitForTimeout(10000); // Give extension time to process

    // Extract data from extension's localStorage or DOM
    console.log('📊 Extracting assignment data...');
    const sceleData = await page.evaluate(() => {
      // Try to get data from localStorage first
      const storageKeys = [
        'scele_assignments',
        'scele_deadlines',
        'scele_summary',
        'assignments',
        'deadlines',
      ];

      for (const key of storageKeys) {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            return JSON.parse(data);
          } catch (e) {
            console.log(`Failed to parse ${key}:`, e);
          }
        }
      }

      // Try to get data from DOM elements injected by extension
      const dataElement = document.querySelector('[data-scele-assignments]');
      if (dataElement) {
        try {
          return JSON.parse(dataElement.getAttribute('data-scele-assignments'));
        } catch (e) {
          console.log('Failed to parse DOM data:', e);
        }
      }

      // Try to get data from window object
      if (window.sceleAssignments) {
        return window.sceleAssignments;
      }

      return null;
    });

    if (!sceleData || (Array.isArray(sceleData) && sceleData.length === 0)) {
      console.warn('⚠️  No assignment data found. Extension may not have loaded properly.');
      console.log('📸 Taking screenshot for debugging...');
      await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
      return [];
    }

    console.log(`✅ Extracted ${Array.isArray(sceleData) ? sceleData.length : 'unknown'} assignments`);
    return Array.isArray(sceleData) ? sceleData : [sceleData];

  } catch (error) {
    console.error('❌ Failed to extract SCELE data:', error.message);
    throw error;
  } finally {
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 Starting SCELE to Google Calendar sync...');
  console.log('⏰ Timestamp:', new Date().toISOString());
  console.log('');

  try {
    // Step 1: Extract data from SCELE
    const sceleData = await extractSceleData();

    if (!sceleData || sceleData.length === 0) {
      console.log('⚠️  No assignments found to sync. Exiting...');
      return;
    }

    console.log('');
    console.log('📋 Assignment Summary:');
    sceleData.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.title || item.name} - ${item.deadline || item.dueDate}`);
    });
    console.log('');

    // Step 2: Initialize Google Calendar
    const calendar = await initializeGoogleCalendar();

    // Step 3: Clear all future events
    await clearFutureEvents(calendar);

    // Step 4: Insert new events
    await insertEvents(calendar, sceleData);

    console.log('');
    console.log('✅ Sync completed successfully!');
    console.log('⏰ Finished at:', new Date().toISOString());

  } catch (error) {
    console.error('');
    console.error('❌ Sync failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the main function
main();

// Made with Bob
