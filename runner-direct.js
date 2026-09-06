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
 * Get all events from calendar
 */
async function getAllCalendarEvents(calendar) {
  try {
    console.log('📋 Fetching all calendar events...');
    
    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 2500,
    });

    const events = response.data.items || [];
    console.log(`📋 Found ${events.length} events in calendar`);
    return events;
  } catch (error) {
    console.error('❌ Failed to fetch calendar events:', error.message);
    throw error;
  }
}

/**
 * Delete all events from the calendar
 */
async function clearAllEvents(calendar) {
  try {
    console.log('🗑️  Clearing all calendar events...');
    
    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      singleEvents: true,
      maxResults: 2500,
    });

    const events = response.data.items || [];
    console.log(`📋 Found ${events.length} events to delete`);

    if (events.length === 0) {
      console.log('✅ No events to delete');
      return;
    }

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

    console.log(`✅ Deleted ${deletedCount} events`);
  } catch (error) {
    console.error('❌ Failed to clear events:', error.message);
    throw error;
  }
}

/**
 * Compare scraped events with calendar events
 */
function eventsAreDifferent(sceleEvents, calendarEvents) {
  // If counts are different, they're different
  if (sceleEvents.length !== calendarEvents.length) {
    console.log(`📊 Event count mismatch: SCELE=${sceleEvents.length}, Calendar=${calendarEvents.length}`);
    return true;
  }

  // Create a set of event signatures from SCELE data
  const sceleSignatures = new Set(
    sceleEvents.map(e => {
      const date = new Date(e.deadlineMs).toISOString();
      return `${e.name}|${date}|${e.type}|${e.course}`;
    })
  );

  // Create a set of event signatures from calendar
  const calendarSignatures = new Set(
    calendarEvents.map(e => {
      const summary = e.summary || '';
      const date = e.start?.dateTime || e.start?.date || '';
      const description = e.description || '';
      // Extract type and course from description
      const match = description.match(/^([^-]+) - (.+)/);
      const type = match ? match[1].trim() : '';
      const course = match ? match[2].split('\n')[0].trim() : '';
      return `${summary}|${date}|${type}|${course}`;
    })
  );

  // Check if all SCELE events exist in calendar
  for (const sig of sceleSignatures) {
    if (!calendarSignatures.has(sig)) {
      console.log(`📊 Missing event in calendar: ${sig.split('|')[0]}`);
      return true;
    }
  }

  // Check if all calendar events exist in SCELE
  for (const sig of calendarSignatures) {
    if (!sceleSignatures.has(sig)) {
      console.log(`📊 Extra event in calendar: ${sig.split('|')[0]}`);
      return true;
    }
  }

  console.log('✅ Calendar is already up to date');
  return false;
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
        // Add tag to event name if it's a forum/announcement with datePosted or lastPost
        let eventName = event.name || 'SCELE Assignment';
        if (event.datePosted) {
          eventName = `[dateposted] ${eventName}`;
        } else if (event.lastPost) {
          eventName = `[lastpost] ${eventName}`;
        }
        
        const eventData = {
          summary: eventName,
          description: `${event.type} - ${event.course}\n\nLink: ${event.url}`,
          location: event.url,
          start: {
            dateTime: new Date(event.deadlineMs).toISOString(),
            timeZone: 'Asia/Jakarta',
          },
          end: {
            dateTime: new Date(event.deadlineMs + 60 * 60 * 1000).toISOString(),
            timeZone: 'Asia/Jakarta',
          },
          colorId: event.type === 'Quiz' ? '11' : event.type === 'Forum' ? '5' : event.type === 'Announcement' ? '9' : '1',
          transparency: 'transparent', // Set as "free" instead of "busy"
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
 * Parse Moodle date format to timestamp
 */
function parseMoodleDate(dateStr) {
  // Handle null or undefined dates
  if (!dateStr) {
    return null;
  }
  
  // Try parsing as-is first (handles formats like "Wednesday, August 26, 2026 at 05:55 PM")
  let date = new Date(dateStr);
  let timestamp = date.getTime();
  
  if (!isNaN(timestamp)) {
    return timestamp;
  }
  
  // Try Moodle format: "Monday, 9 September 2024, 11:59 PM"
  const cleaned = dateStr.replace(/,/g, '');
  date = new Date(cleaned);
  timestamp = date.getTime();
  
  if (!isNaN(timestamp)) {
    return timestamp;
  }
  
  // Try removing "at" for forum dates: "Wednesday, August 26, 2026 at 05:55 PM" -> "Wednesday August 26 2026 05:55 PM"
  const withoutAt = dateStr.replace(/ at /gi, ' ');
  date = new Date(withoutAt);
  timestamp = date.getTime();
  
  // Return null if date is still invalid
  return isNaN(timestamp) ? null : timestamp;
}

/**
 * Extract assignments and quizzes from SCELE
 */
async function extractSceleData() {
  let browser = null;
  let context = null;

  try {
    console.log('🚀 Launching browser...');
    
    // Use headless mode in CI, non-headless locally for debugging
    const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
    
    browser = await chromium.launch({
      headless: isCI, // Headless in CI, visible locally
      args: isCI ? [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ] : []
    });

    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    const page = await context.newPage();

    console.log('🔐 Navigating to SCELE login page...');
    await page.goto('https://scele.cs.ui.ac.id/login/index.php', {
      waitUntil: 'domcontentloaded', // Changed from networkidle for faster loading
      timeout: 90000, // Increased timeout for CI
    });

    console.log('⏳ Waiting for CAS SSO login form...');
    await page.waitForSelector('input[name="username"]', { timeout: 60000 }); // Increased timeout

    console.log('📝 Filling in credentials...');
    await page.fill('input[name="username"]', SCELE_USERNAME);
    await page.fill('input[name="password"]', SCELE_PASSWORD);

    console.log('🔑 Submitting login form...');
    await page.click('button[type="submit"], input[type="submit"]');

    console.log('⏳ Waiting for redirect to SCELE dashboard...');
    await page.waitForURL('**/scele.cs.ui.ac.id/**', {
      timeout: 90000, // Increased timeout for CI
      waitUntil: 'domcontentloaded', // Changed from networkidle
    });
    
    // Extra wait to ensure page is fully loaded
    await page.waitForTimeout(3000);

    console.log('✅ Successfully logged in to SCELE');

    // Get all course links
    console.log('📚 Fetching course list...');
    const courses = await page.evaluate(() => {
      const links = document.querySelectorAll('.block_navigation a[href*="/course/view.php?id="]');
      const result = [];
      const seen = new Set();
      
      for (const link of links) {
        const match = link.href.match(/[?&]id=(\d+)/);
        if (!match) continue;
        const id = match[1];
        if (seen.has(id)) continue;
        seen.add(id);
        
        const title = link.getAttribute('title') || link.textContent.trim();
        result.push({ id, title, url: link.href });
      }
      
      return result;
    });

    console.log(`📋 Found ${courses.length} courses`);
    
    // Log all course titles for debugging
    if (courses.length > 0) {
      console.log('📝 All courses found:');
      courses.forEach(c => console.log(`   - ${c.title}`));
    }

    // Filter for 2026/2027 academic year only
    const filteredCourses = courses.filter(course => {
      const title = course.title.toLowerCase();
      return title.includes('2026/2027') ||
             title.includes('gasal 2026') ||
             title.includes('genap 2026') ||
             title.includes('odd 2026') ||
             title.includes('even 2026');
    });

    console.log(`📚 Filtered to ${filteredCourses.length} courses for 2026/2027 academic year`);
    
    if (filteredCourses.length > 0) {
      console.log('✅ Filtered courses:');
      filteredCourses.forEach(c => console.log(`   - ${c.title}`));
    } else {
      console.warn('⚠️ No courses matched the 2026/2027 filter!');
    }

    const allAssignments = [];

    // Visit each course and extract assignments/quizzes
    for (const course of filteredCourses) {
      console.log(`  📖 Checking course: ${course.title}`);
      
      try {
        await page.goto(course.url, {
          waitUntil: 'domcontentloaded', // Changed from networkidle
          timeout: 60000 // Increased timeout
        });
        
        // Wait for course content to load
        await page.waitForTimeout(2000);
        
        const assignments = await page.evaluate((courseName) => {
          const items = [];
          const activities = document.querySelectorAll('li.activity.assign, li.activity.quiz, li.activity.forum, li.activity.forum[class*="news"]');
          
          for (const li of activities) {
            let type = 'Assignment';
            if (li.classList.contains('quiz')) type = 'Quiz';
            if (li.classList.contains('forum')) {
              // Check if it's an announcement forum (news forum)
              const instanceName = li.querySelector('.instancename');
              if (instanceName && instanceName.textContent.toLowerCase().includes('announcement')) {
                type = 'Announcement';
              } else {
                type = 'Forum';
              }
            }
            
            const link = li.querySelector('a.aalink');
            if (!link) continue;
            
            const url = link.href;
            const nameSpan = li.querySelector('.instancename');
            let name = '';
            if (nameSpan) {
              const clone = nameSpan.cloneNode(true);
              // Remove hidden accessibility text
              clone.querySelectorAll('.accesshide').forEach(e => e.remove());
              name = clone.textContent.trim();
            }
            
            // Fallback: try to get name from link text if instancename is empty
            if (!name && link) {
              name = link.textContent.trim();
            }
            
            // Fallback: try to get from title attribute
            if (!name && link) {
              name = link.getAttribute('title') || '';
            }
            
            // If still no name, skip this item
            if (!name) {
              console.warn(`Skipping item with no name: ${url}`);
              continue;
            }
            
            let deadline = '';
            const dateRegion = li.querySelector('[data-region="activity-dates"]');
            if (dateRegion) {
              const divs = dateRegion.querySelectorAll('div');
              for (const d of divs) {
                const txt = d.textContent.trim();
                const m = txt.match(/^([^:]+):\s*(.+)$/);
                if (!m) continue;
                const label = m[1].trim();
                if (/^Opened?s?$/i.test(label)) continue;
                deadline = m[2].trim();
              }
            }
            
            // For assignments and quizzes, only add if they have a deadline
            // For forums and announcements, add them even without deadline (we'll fetch post date later)
            if (deadline || type === 'Forum' || type === 'Announcement') {
              items.push({
                type,
                name,
                url,
                course: courseName,
                deadline: deadline || null,
              });
            }
          }
          
          return items;
        }, course.title);
        
        if (assignments.length > 0) {
          console.log(`    ✓ Found ${assignments.length} items`);
          // Log what was found for debugging
          assignments.forEach(item => {
            console.log(`      - ${item.type}: "${item.name}" ${item.deadline ? `(${item.deadline})` : '(no deadline)'}`);
          });
          
          // For forums and announcements without deadlines, fetch both first and last post dates
          for (const item of assignments) {
            if ((item.type === 'Forum' || item.type === 'Announcement') && !item.deadline) {
              try {
                await page.goto(item.url, { waitUntil: 'networkidle', timeout: 15000 });
                
                const postDates = await page.evaluate(() => {
                  const timeElements = document.querySelectorAll('time[datetime]');
                  let firstMs = Infinity;
                  let lastMs = 0;
                  
                  for (const timeEl of timeElements) {
                    const dt = timeEl.getAttribute('datetime');
                    if (dt) {
                      const d = new Date(dt);
                      if (!isNaN(d.getTime())) {
                        if (d.getTime() < firstMs) firstMs = d.getTime();
                        if (d.getTime() > lastMs) lastMs = d.getTime();
                      }
                    }
                  }
                  
                  const formatDate = (ms) => {
                    return new Date(ms).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    });
                  };
                  
                  return {
                    first: firstMs < Infinity ? formatDate(firstMs) : null,
                    last: lastMs > 0 ? formatDate(lastMs) : null
                  };
                });
                
                if (postDates.first) {
                  item.deadline = postDates.first;
                  item.datePosted = true; // Mark as date posted
                  console.log(`      → Forum date posted: ${postDates.first}`);
                }
                
                // Create a duplicate entry for last post if different from first
                if (postDates.last && postDates.first !== postDates.last) {
                  const lastPostItem = {
                    ...item,
                    deadline: postDates.last,
                    lastPost: true, // Mark as last post
                    datePosted: false // Remove datePosted flag
                  };
                  delete lastPostItem.datePosted; // Ensure datePosted is not present
                  lastPostItem.lastPost = true;
                  
                  assignments.push(lastPostItem);
                  console.log(`      → Forum last post: ${postDates.last}`);
                }
              } catch (error) {
                console.warn(`      → Failed to fetch forum post dates: ${error.message}`);
              }
            }
          }
          
          allAssignments.push(...assignments);
        }
      } catch (error) {
        console.warn(`    ✗ Failed to check course: ${error.message}`);
      }
    }

    // Parse deadlines and filter out items without valid dates
    const validAssignments = [];
    for (const assignment of allAssignments) {
      assignment.deadlineMs = parseMoodleDate(assignment.deadline);
      
      // Only include items with valid deadlines
      if (assignment.deadlineMs) {
        validAssignments.push(assignment);
      } else {
        console.warn(`    ⚠️  Skipping "${assignment.name}" - no valid deadline`);
      }
    }

    console.log(`✅ Extracted ${validAssignments.length} total assignments/quizzes/forums with valid deadlines`);
    return validAssignments;

  } catch (error) {
    console.error('❌ Failed to extract SCELE data:', error.message);
    throw error;
  } finally {
    try {
      if (context) {
        await context.close();
      }
      if (browser) {
        await browser.close();
      }
      console.log('✅ Browser closed');
    } catch (closeError) {
      console.warn('⚠️  Error closing browser:', closeError.message);
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
      console.log(`  ${index + 1}. ${item.name} - ${item.deadline}`);
    });
    console.log('');

    // Step 2: Initialize Google Calendar
    const calendar = await initializeGoogleCalendar();

    // Step 3: Get existing calendar events
    const existingEvents = await getAllCalendarEvents(calendar);

    // Step 4: Compare and decide if update is needed
    if (eventsAreDifferent(sceleData, existingEvents)) {
      console.log('🔄 Calendar needs update - clearing and reinstating all events...');
      
      // Step 5: Clear all events
      await clearAllEvents(calendar);

      // Step 6: Insert new events
      await insertEvents(calendar, sceleData);
    } else {
      console.log('✅ Calendar is already up to date - no changes needed');
    }

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
