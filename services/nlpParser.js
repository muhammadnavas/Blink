import * as chrono from 'chrono-node';

/**
 * Natural Language Processing Parser for Smart Reminders
 * Parses natural language input like "Remind me to call mom at 7 PM"
 */

// Common reminder patterns and keywords
const REMINDER_PATTERNS = {
  // Action patterns - what to do
  actions: [
    /remind me to (.+)/i,
    /remember to (.+)/i,
    /don't forget to (.+)/i,
    /make sure I (.+)/i,
    /(.+) reminder/i,
    /I need to (.+)/i,
    /(.+)/i // Fallback - treat entire text as action
  ],
  
  // Time patterns - when to remind
  timeKeywords: [
    'at', 'on', 'in', 'after', 'before', 'by', 'until', 'every', 'daily', 'weekly'
  ],
  
  // Priority patterns
  priority: {
    urgent: /urgent|asap|important|critical|high priority/i,
    high: /high|soon|quick/i,
    low: /low|later|sometime/i
  },
  
  // Category patterns
  categories: {
    'Work': /work|meeting|presentation|deadline|office|project|email|call|conference/i,
    'Health': /doctor|appointment|medicine|pill|workout|exercise|checkup|health/i,
    'Personal': /birthday|anniversary|family|friend|personal|home/i,
    'Shopping': /buy|shop|grocery|store|market|purchase/i,
    'Finance': /pay|bill|bank|money|payment|tax/i,
    'Travel': /flight|trip|vacation|travel|airport|hotel/i,
    'Study': /study|exam|homework|class|school|university|learn/i,
    'Social': /party|dinner|lunch|meet|hangout|social/i
  },
  
  // Recurring patterns
  recurring: {
    daily: /daily|every day|each day/i,
    weekly: /weekly|every week|each week/i,
    monthly: /monthly|every month|each month/i,
    weekdays: {
      monday: /monday|mon/i,
      tuesday: /tuesday|tue/i,
      wednesday: /wednesday|wed/i,
      thursday: /thursday|thu/i,
      friday: /friday|fri/i,
      saturday: /saturday|sat/i,
      sunday: /sunday|sun/i
    }
  }
};

/**
 * Parse natural language input into structured reminder data
 * @param {string} input - Natural language input like "Remind me to call mom at 7 PM"
 * @returns {object} Parsed reminder data
 */
export function parseNaturalLanguage(input) {
  console.log(`🧠 Parsing natural language: "${input}"`);
  
  try {
    const result = {
      originalInput: input,
      success: false,
      reminder: {
        text: '',
        category: 'Personal',
        priority: 'medium',
        type: 'one-time',
        time: null,
        note: '',
        confidence: 0
      },
      parseDetails: {
        timeFound: false,
        actionFound: false,
        categoryDetected: false,
        priorityDetected: false,
        recurringDetected: false
      }
    };

    // Step 1: Extract action/task from the input
    const actionResult = extractAction(input);
    if (actionResult.found) {
      result.reminder.text = actionResult.action;
      result.parseDetails.actionFound = true;
      result.reminder.confidence += 30;
    } else {
      result.reminder.text = input; // Use full input as fallback
      result.reminder.confidence += 10;
    }

    // Step 2: Parse time/date information using chrono-node
    const timeResult = parseDateTime(input);
    if (timeResult.found) {
      result.reminder.time = timeResult.seconds;
      result.reminder.scheduledDate = timeResult.date;
      result.reminder.timeDescription = timeResult.description;
      result.parseDetails.timeFound = true;
      result.reminder.confidence += 40;
    } else {
      // Default to 5 minutes if no time specified
      result.reminder.time = 300; // 5 minutes
      result.reminder.timeDescription = '5 minutes';
      result.reminder.confidence += 5;
    }

    // Step 3: Detect category from keywords
    const categoryResult = detectCategory(input);
    if (categoryResult.found) {
      result.reminder.category = categoryResult.category;
      result.parseDetails.categoryDetected = true;
      result.reminder.confidence += 15;
    }

    // Step 4: Detect priority level
    const priorityResult = detectPriority(input);
    if (priorityResult.found) {
      result.reminder.priority = priorityResult.priority;
      result.parseDetails.priorityDetected = true;
      result.reminder.confidence += 10;
    }

    // Step 5: Detect if it's recurring
    const recurringResult = detectRecurring(input);
    if (recurringResult.found) {
      result.reminder.type = recurringResult.type;
      result.reminder.recurringDetails = recurringResult.details;
      result.parseDetails.recurringDetected = true;
      result.reminder.confidence += 15;
    }

    // Step 6: Generate a note with parsing details
    result.reminder.note = generateParsingNote(result);

    // Consider parsing successful if confidence > 40
    result.success = result.reminder.confidence > 40;

    console.log(`📊 Parsing result (confidence: ${result.reminder.confidence}%):`, result);
    return result;

  } catch (error) {
    console.error('❌ Error parsing natural language:', error);
    return {
      originalInput: input,
      success: false,
      error: error.message,
      reminder: {
        text: input,
        category: 'Personal',
        priority: 'medium',
        type: 'one-time',
        time: 300, // 5 minutes default
        note: 'Failed to parse - using defaults',
        confidence: 0
      }
    };
  }
}

/**
 * Extract the main action/task from the input
 */
function extractAction(input) {
  for (const pattern of REMINDER_PATTERNS.actions) {
    const match = input.match(pattern);
    if (match) {
      const action = match[1] ? match[1].trim() : match[0].trim();
      // Clean up the action text
      const cleanAction = action
        .replace(/\s+(at|on|in|after|before|by|until)\s+.*/i, '') // Remove time part
        .replace(/\s+(daily|weekly|monthly|every day|every week)/i, '') // Remove recurring part
        .trim();
      
      if (cleanAction.length > 0) {
        return {
          found: true,
          action: cleanAction,
          originalMatch: match[0]
        };
      }
    }
  }
  
  return { found: false, action: input };
}

/**
 * Parse date/time information using chrono-node
 */
function parseDateTime(input) {
  try {
    const results = chrono.parse(input);
    
    if (results.length > 0) {
      const parsed = results[0];
      let date = parsed.start.date();
      const now = new Date();
      
      // If parsed time is in the past, move it to next occurrence
      if (date <= now) {
        // For times today that have passed, move to tomorrow
        if (date.toDateString() === now.toDateString()) {
          date.setDate(date.getDate() + 1);
        }
        // For past dates, try to interpret as relative to today
        else if (date < now) {
          const timeStr = date.toTimeString().split(' ')[0];
          const [hours, minutes] = timeStr.split(':').map(Number);
          date = new Date();
          date.setHours(hours, minutes, 0, 0);
          if (date <= now) {
            date.setDate(date.getDate() + 1);
          }
        }
      }
      
      // Calculate seconds from now
      const diffMs = date.getTime() - now.getTime();
      const diffSeconds = Math.max(60, Math.floor(diffMs / 1000)); // Minimum 1 minute
      
      return {
        found: true,
        date: date,
        seconds: diffSeconds,
        description: formatTimeDescription(date, diffSeconds),
        originalText: parsed.text,
        confidence: parsed.start.isCertain() ? 90 : 60
      };
    }
    
    // Check for relative time patterns (more comprehensive)
    const relativePatterns = [
      { pattern: /in (\d+) minutes?/i, multiplier: 60 },
      { pattern: /in (\d+) hours?/i, multiplier: 3600 },
      { pattern: /in (\d+) days?/i, multiplier: 86400 },
      { pattern: /(\d+) minutes? from now/i, multiplier: 60 },
      { pattern: /(\d+) hours? from now/i, multiplier: 3600 },
      { pattern: /(\d+) mins?/i, multiplier: 60 },
      { pattern: /(\d+)m/i, multiplier: 60 },
      { pattern: /(\d+)h/i, multiplier: 3600 },
      // Handle standalone numbers as minutes (common in voice input)
      { pattern: /^(\d+)$/i, multiplier: 60, condition: (val) => val >= 1 && val <= 480 } // 1-480 minutes (8 hours max)
    ];
    
    for (const { pattern, multiplier, condition } of relativePatterns) {
      const match = input.match(pattern);
      if (match) {
        const value = parseInt(match[1]);
        
        // Apply condition if specified (for standalone numbers)
        if (condition && !condition(value)) {
          continue;
        }
        
        const seconds = Math.max(60, value * multiplier); // Minimum 1 minute
        const futureDate = new Date(Date.now() + seconds * 1000);
        
        // Generate appropriate description
        let description;
        if (multiplier === 60) {
          description = `in ${value} minute${value > 1 ? 's' : ''}`;
        } else if (multiplier === 3600) {
          description = `in ${value} hour${value > 1 ? 's' : ''}`;
        } else {
          description = `in ${value} day${value > 1 ? 's' : ''}`;
        }
        
        return {
          found: true,
          date: futureDate,
          seconds: seconds,
          description: description,
          originalText: match[0],
          confidence: condition ? 70 : 85 // Lower confidence for standalone numbers
        };
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error('Error parsing date/time:', error);
    return { found: false };
  }
}

/**
 * Detect category based on keywords in the input
 */
function detectCategory(input) {
  for (const [category, pattern] of Object.entries(REMINDER_PATTERNS.categories)) {
    if (pattern.test(input)) {
      return {
        found: true,
        category: category,
        confidence: 70
      };
    }
  }
  
  return { found: false, category: 'Personal' };
}

/**
 * Detect priority level from the input
 */
function detectPriority(input) {
  for (const [priority, pattern] of Object.entries(REMINDER_PATTERNS.priority)) {
    if (pattern.test(input)) {
      return {
        found: true,
        priority: priority,
        confidence: 80
      };
    }
  }
  
  return { found: false, priority: 'medium' };
}

/**
 * Detect if the reminder is recurring
 */
function detectRecurring(input) {
  // Check for daily patterns
  if (REMINDER_PATTERNS.recurring.daily.test(input)) {
    return {
      found: true,
      type: 'daily',
      details: { hour: 9, minute: 0 }, // Default time
      confidence: 85
    };
  }
  
  // Check for weekly patterns
  if (REMINDER_PATTERNS.recurring.weekly.test(input)) {
    // Try to find specific weekday
    for (const [day, pattern] of Object.entries(REMINDER_PATTERNS.recurring.weekdays)) {
      if (pattern.test(input)) {
        const weekdayMap = {
          sunday: 1, monday: 2, tuesday: 3, wednesday: 4,
          thursday: 5, friday: 6, saturday: 7
        };
        
        return {
          found: true,
          type: 'weekly',
          details: { weekday: weekdayMap[day], hour: 9, minute: 0 },
          confidence: 90
        };
      }
    }
    
    return {
      found: true,
      type: 'weekly',
      details: { weekday: 2, hour: 9, minute: 0 }, // Default to Monday
      confidence: 70
    };
  }
  
  return { found: false };
}

/**
 * Format time description for display
 */
function formatTimeDescription(date, seconds) {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const isTomorrow = date.toDateString() === new Date(now.getTime() + 86400000).toDateString();
  
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  } else if (seconds < 86400 && isToday) {
    return `today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } else if (isTomorrow) {
    return `tomorrow at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } else if (seconds < 604800) { // Within a week
    const dayName = date.toLocaleDateString([], { weekday: 'long' });
    return `${dayName} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  } else {
    return `on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
  }
}

/**
 * Generate a note explaining how the input was parsed
 */
function generateParsingNote(result) {
  const notes = [];
  
  if (result.parseDetails.actionFound) {
    notes.push('✓ Action detected');
  }
  
  if (result.parseDetails.timeFound) {
    notes.push('✓ Time parsed');
  } else {
    notes.push('⚠ Using default time (5 min)');
  }
  
  if (result.parseDetails.categoryDetected) {
    notes.push('✓ Category auto-detected');
  }
  
  if (result.parseDetails.priorityDetected) {
    notes.push('✓ Priority detected');
  }
  
  if (result.parseDetails.recurringDetected) {
    notes.push('✓ Recurring pattern found');
  }
  
  return `Smart parsed: ${notes.join(', ')}`;
}

/**
 * Get suggestions for improving natural language input
 */
export function getInputSuggestions() {
  return [
    "Remind me to call mom at 7 PM",
    "Take medicine in 30 minutes",
    "Daily reminder to exercise at 8 AM",
    "Meeting with John tomorrow at 2 PM",
    "Buy groceries this evening",
    "Pay bills by Friday",
    "Doctor appointment next Tuesday at 10 AM",
    "Weekly reminder to clean house on Sunday",
    "Urgent: Submit report today",
    "Don't forget to water plants every 3 days"
  ];
}

/**
 * Validate and improve parsed results
 */
export function validateParsedResult(result) {
  const validation = {
    isValid: true,
    warnings: [],
    suggestions: []
  };
  
  // Check if confidence is too low
  if (result.reminder.confidence < 50) {
    validation.warnings.push('Low confidence in parsing - please review the reminder details');
  }
  
  // Check if time is in the past
  if (result.reminder.scheduledDate && result.reminder.scheduledDate < new Date()) {
    validation.warnings.push('Scheduled time appears to be in the past');
    validation.suggestions.push('Consider using "tomorrow" or a specific future date');
  }
  
  // Check if time is too far in the future (more than 1 year)
  if (result.reminder.time && result.reminder.time > 31536000) { // 1 year in seconds
    validation.warnings.push('Reminder is scheduled very far in the future');
    validation.suggestions.push('Consider setting a nearer reminder or using recurring reminders');
  }
  
  // Check if time is too soon (less than 1 minute)
  if (result.reminder.time && result.reminder.time < 60) {
    validation.warnings.push('Reminder time is very soon (less than 1 minute)');
    validation.suggestions.push('Consider setting a reminder for at least 1 minute from now');
  }
  
  // Check if action text is very short
  if (result.reminder.text.length < 3) {
    validation.warnings.push('Reminder text is very short');
    validation.suggestions.push('Try being more specific about what you want to be reminded of');
  }
  
  // Check for potentially invalid recurring settings
  if (result.reminder.type === 'daily' && result.reminder.recurringDetails) {
    const { hour, minute } = result.reminder.recurringDetails;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      validation.warnings.push('Invalid time for daily reminder');
      validation.suggestions.push('Please use a valid time format (0-23 hours, 0-59 minutes)');
    }
  }
  
  return validation;
}

/**
 * Examples of supported natural language patterns
 */
export const SUPPORTED_PATTERNS = {
  examples: [
    {
      input: "Remind me to call mom at 7 PM",
      parsed: "Action: call mom, Time: 7 PM today, Category: Personal"
    },
    {
      input: "Take medicine in 30 minutes",
      parsed: "Action: Take medicine, Time: 30 minutes from now, Category: Health"
    },
    {
      input: "Daily reminder to exercise at 8 AM",
      parsed: "Action: exercise, Time: 8 AM daily, Type: Recurring"
    },
    {
      input: "Buy groceries this evening",
      parsed: "Action: Buy groceries, Time: This evening, Category: Shopping"
    },
    {
      input: "Urgent meeting tomorrow at 2 PM",
      parsed: "Action: meeting, Time: Tomorrow 2 PM, Priority: Urgent, Category: Work"
    }
  ],
  
  timeFormats: [
    "at 7 PM", "in 30 minutes", "in 2 hours", "tomorrow", "next Monday",
    "at 8:30 AM", "this evening", "tonight", "next week", "in 3 days"
  ],
  
  recurringFormats: [
    "daily", "every day", "weekly", "every Monday", "every week",
    "monthly", "every month"
  ]
};