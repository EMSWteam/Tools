// ============================================
// CONFIGURATION (Set your file path if necessary)
// ============================================

// If your files are NOT in the default iMacros Datasources folder, 
// uncomment the line below and replace the path. Use double backslashes (\\).
// var DATASOURCE_PATH = "C:\\MyDataSources\\"; 
var DATASOURCE_PATH = ""; 

var BRAVE_FILE = "Brave.txt";

// === FIXED 90-MINUTE INTERVAL OFFSETS (Base Schedule) ===
// 11:00, 12:30, 14:00, 15:30, 17:00, 18:30, 20:00, 21:30, 23:00, 01:00 (Day 2)
var BASE_MINUTES_FROM_MIDNIGHT = [
    660, 750, 840, 930, 1020, 1110, 1200, 1290, 1380, 1500 
];

// === GLOBAL CONFIGURATION ===
var batch = 0;                       // Batch size set to 0
var delay = 0;                       // Delay in milliseconds set to 0
var tabsCount = 5;                   // Number of tabs for deployment
var startTab = 2;                    // First tab number (T=2)

// ============================================
// MANUAL HOUR AND MINUTE SELECTION
// ============================================
var now = new Date();
var defaultHour = now.getHours();
var defaultMinute = now.getMinutes();

// Prompt for Start and End Hours (F_h, L_h)
var F_h = parseInt(prompt("Enter Start Hour (F_h) in 24h format:", defaultHour), 10);
var L_h = parseInt(prompt("Enter End Hour (L_h) in 24h format:", defaultHour), 10);

if (isNaN(F_h) || isNaN(L_h) || F_h < 0 || F_h > 23 || L_h < 0 || L_h > 23) {
    alert("Invalid hour input. Exiting script.");
    throw new Error("Invalid hour input.");
}

// Prompt for Minute Component: This minute determines the precise minute of the drop in the F_h hour.
var Minute_Component = parseInt(prompt("Enter Minute component (MM) for the F_h drop (e.g., 29 for 12:29):", defaultMinute), 10);

if (isNaN(Minute_Component) || Minute_Component < 0 || Minute_Component > 59) {
    alert("Invalid minute component input. Exiting script.");
    throw new Error("Invalid minute component input.");
}

// === CALCULATE THE TOTAL MINUTE SHIFT ===
var targetHour = F_h;
var targetMinute = Minute_Component;
var targetTotalMinutes = targetHour * 60 + targetMinute;

// Find the index of the base drop time whose HOUR is closest to the target hour (F_h)
var closestIndex = -1;
var minDiff = Infinity;
for (var i = 0; i < BASE_MINUTES_FROM_MIDNIGHT.length; i++) {
    var currentBaseHour = Math.floor(BASE_MINUTES_FROM_MIDNIGHT[i] / 60);
    var diff = Math.abs(currentBaseHour - targetHour);
    
    // Find the base time that is closest or equal to the target hour (15:30 is better for 15:10 than 14:00)
    if (diff < minDiff) {
        minDiff = diff;
        closestIndex = i;
    } else if (diff === minDiff && currentBaseHour > Math.floor(BASE_MINUTES_FROM_MIDNIGHT[closestIndex] / 60)) {
        // If difference is the same (e.g., 14:00 and 17:00 both 1 hour from 15), choose the later one (17:00)
        minDiff = diff;
        closestIndex = i;
    }
}

// In case of error, default to the 11:00 base time.
if (closestIndex === -1) closestIndex = 0; 

var baseMinutesOfTargetFile = BASE_MINUTES_FROM_MIDNIGHT[closestIndex];

// This is the single, constant shift applied to ALL 10 drops in the schedule.
var totalMinuteOffset = targetTotalMinutes - baseMinutesOfTargetFile; 
// Example: 749 (12:29) - 750 (12:30) = -1 minute.

// ============================================
// FILE READING FUNCTIONS
// ============================================

function GetFileDataLines(file) {
    if (!file) return []; 
    var list = [];
    var i = 1;
    while (true) {
        var macro = "CODE:";
        macro += 'SET !DATASOURCE "' + DATASOURCE_PATH + file + '"\n'; 
        macro += "SET !LOOP " + i + "\n";
        macro += "ADD !EXTRACT {{!COL1}}\n";
        iimPlay(macro);
        var line = iimGetLastExtract();
        if (!line || line === "#EANF#") break; 
        list.push(line);
        i++;
    }
    if (list.length === 0) {
        iimDisplay("ERROR: File is empty or missing: " + file);
    }
    return list;
}

function GetPrefixesContent(file) {
    var lines = GetFileDataLines(file);
    return lines.length > 0 ? lines.join("\\n") : "NO CONTENT READ";
}


// ============================================
// UTILITY FUNCTIONS
// ============================================

function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

// Generates the full 10-drop schedule using the single calculated offset
function generateDynamicSchedule(totalMinuteOffset, prefixes) {
    var dynamicSchedule = {};
    var minutesInDay = 24 * 60;
    
    for (var i = 0; i < BASE_MINUTES_FROM_MIDNIGHT.length; i++) {
        var baseMinutes = BASE_MINUTES_FROM_MIDNIGHT[i]; 
        
        // Apply the constant offset to all base times
        var totalMinutes = baseMinutes + totalMinuteOffset; 
        
        // Handle 24-hour wrap
        var displayMinutes = totalMinutes % minutesInDay;
        if (displayMinutes < 0) displayMinutes += minutesInDay; // Handle negative offset wrap
        
        var hour = Math.floor(displayMinutes / 60);
        var minute = displayMinutes % 60;
        
        var timeString = pad2(hour) + ":" + pad2(minute);
        var filePrefix = prefixes[i];

        if (filePrefix) {
            dynamicSchedule[timeString] = filePrefix;
        }
    }
    return dynamicSchedule;
}

function mapHourToRow(hour) {
    if (hour >= 11 && hour <= 23) {
        return hour - 10;
    } else {
        return (hour + 24) - 10;
    }
}

function mapRowToListNbr(row) {
    return row + 14;
}

function getDynamicLaunchAt(timeString) {
    var now = new Date();
    var parts = timeString.split(':');
    var launchHour = parseInt(parts[0], 10);
    var launchMinute = parseInt(parts[1], 10);
    var addDay = 0;
    
    if (launchHour < now.getHours()) {
        addDay = 1;
    } else if (launchHour === now.getHours() && launchMinute <= now.getMinutes()) {
         addDay = 1;
    }

    now.setDate(now.getDate() + addDay);

    var yyyy = now.getFullYear();
    var mm = pad2(now.getMonth() + 1);
    var dd = pad2(now.getDate());
    var hh = pad2(launchHour);
    var min = pad2(launchMinute); 

    return '"' + yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + '"';
}

// === BUILD MACRO FOR EACH TAB ===
function buildTabMacro(tabNum, tabContent, launchAt, listNbr) {
    
    var macro = "TAB T=" + tabNum + "\n";
    macro += "wait seconds=1\n";

    // 1. Close Button
    macro += "TAG POS=5 TYPE=BUTTON ATTR=TXT:Close\n";
    macro += "wait seconds=1\n";
	macro += "TAG POS=1 TYPE=INPUT:CHECKBOX FORM=ID:deploy-form ATTR=ID:rcpt-to-switcher CONTENT=YES\n";
    // macro += "TAG POS=1 TYPE=INPUT:CHECKBOX ATTR=ID:rcpt-to-switcher CONTENT=YES\n";
	// macro += "TAG POS=1 TYPE=INPUT:CHECKBOX FORM=ID:deploy-form ATTR=ID:rcpt-to-switcher CONTENT=NO\n";
	// macro += "TAG POS=1 TYPE=INPUT:CHECKBOX FORM=ID:deploy-form ATTR=ID:rcpt-to-switcher\n";
	macro += "wait seconds=1\n";

    // 2. INJECT SPLIT FILE CONTENT 
    macro += 'TAG POS=1 TYPE=TEXTAREA FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + tabContent + '"\n';
    macro += "wait seconds=1\n";

    // 3. Turns off the paused toggle switch 
    macro += "TAG POS=21 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
    macro += "wait seconds=1\n";

    // 4. Set Launch At time
    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
    macro += "wait seconds=1\n";

    // 5. Set batch and delay settings (0 and 0)
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch&&NAME:system_speed[batch] CONTENT=" + batch + "\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay&&NAME:system_speed[delay] CONTENT=" + delay + "\n";

    // 6. Setting send mode to non_blocking
    macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";

    // 7. Submit button
    macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
    macro += "wait seconds=2\n";

    return macro;
}

// ============================================
// MAIN EXECUTION
// ============================================

// 1. Read file prefixes from Brave.txt
var filePrefixesContent = GetPrefixesContent(BRAVE_FILE);
var prefixArray = filePrefixesContent.split("\\n").map(p => p.trim()).filter(p => p.length > 0);

if (prefixArray.length < BASE_MINUTES_FROM_MIDNIGHT.length) {
    alert("ERROR: Brave.txt must contain at least " + BASE_MINUTES_FROM_MIDNIGHT.length + " lines (10 file prefixes). Check the file contents and location.");
    throw new Error("Brave.txt incomplete.");
}

// 2. Generate the DYNAMIC SCHEDULE based on the total minute shift
var DYNAMIC_SCHEDULE = generateDynamicSchedule(totalMinuteOffset, prefixArray);

// 3. Determine all hours in the range (handling midnight wrap)
var hoursToFilter = [];
if (F_h <= L_h) {
    for (var h = F_h; h <= L_h; h++) {
        hoursToFilter.push(h);
    }
} else { // Midnight wrap
    for (var h = F_h; h < 24; h++) {
        hoursToFilter.push(h);
    }
    for (var h = 0; h <= L_h; h++) {
        hoursToFilter.push(h);
    }
}

// 4. Filter the DYNAMIC_SCHEDULE by the user's F_h/L_h range
var tasksToRun = [];
for (var time in DYNAMIC_SCHEDULE) {
    var hour = parseInt(time.split(':')[0], 10);
    
    if (hoursToFilter.indexOf(hour) !== -1) {
        tasksToRun.push({
            time: time,
            hour: hour,
            filePrefix: DYNAMIC_SCHEDULE[time],
            fileName: DYNAMIC_SCHEDULE[time] + ".txt"
        });
    }
}

// 5. Sort the tasks by time for correct execution order
tasksToRun.sort(function(a, b) {
    var aParts = a.time.split(':');
    var bParts = b.time.split(':');
    var aTotal = parseInt(aParts[0], 10) * 60 + parseInt(aParts[1], 10);
    var bTotal = parseInt(bParts[0], 10) * 60 + parseInt(bParts[1], 10);

    // Adjust for early morning times to ensure correct sorting (e.g., 01:29 comes after 23:59)
    if (aTotal < 600) aTotal += 24 * 60; 
    if (bTotal < 600) bTotal += 24 * 60;

    return aTotal - bTotal;
});

// Display the plan to the user
var planText = tasksToRun.map(t => `${t.time} -> ${t.fileName}`).join('\n');
prompt("Deployment Plan:", "The script will run " + tasksToRun.length + " drops with a 90-minute interval, anchored to " + pad2(F_h) + ":" + pad2(Minute_Component) + ".\n\nRange: " + pad2(F_h) + ":XX to " + pad2(L_h) + ":XX\n\n" + planText);


// 6. Setup global macro header
var initGlobal = "CODE:";
initGlobal += "SET !ERRORIGNORE YES\n";
initGlobal += "SET !TIMEOUT_STEP 3\n";
initGlobal += "SET !TIMEOUT_PAGE 10\n";
initGlobal += "SET !WAITPAGECOMPLETE YES\n";
initGlobal += "SET !REPLAYSPEED FAST\n";
initGlobal += "TAB T=1\n";


// 7. Loop through each task and execute deployment
for (var idx = 0; idx < tasksToRun.length; idx++) {
    var currentTask = tasksToRun[idx];
    
    var j = currentTask.hour;
    var row = mapHourToRow(j);
    var listNbr = mapRowToListNbr(row); 

    var DataSource_File = currentTask.fileName;

    iimDisplay("Executing Task " + (idx + 1) + " of " + tasksToRun.length + ":\nFile: " + DataSource_File + " at " + currentTask.time);

    // READ FILE CONTENT AS AN ARRAY OF LINES
    var allFileLines = GetFileDataLines(DataSource_File); 
    
    if (allFileLines.length === 0) {
        iimDisplay("Skipping task: Could not read content or file is empty: " + DataSource_File);
        continue; 
    }

    // === CONTENT SPLITTING LOGIC ===
    var baseLinesPerTab = Math.floor(allFileLines.length / tabsCount);
    var extraLines = allFileLines.length % tabsCount;
    var currentLineIndex = 0;
    var tabContents = [];

    for (var t = 0; t < tabsCount; t++) {
        var linesForThisTab = baseLinesPerTab + (t < extraLines ? 1 : 0);
        var contentArray = allFileLines.slice(currentLineIndex, currentLineIndex + linesForThisTab);
        
        tabContents[t] = contentArray.join("\\n"); 
        currentLineIndex += linesForThisTab;
    }
    // === END CONTENT SPLITTING ===


    var launchAt = getDynamicLaunchAt(currentTask.time);
    var macro = initGlobal;

    macro += "SET !LOOP " + row + "\n"; 
    macro += "wait seconds=1\n";

    // 8. Loop through the 5 tabs and execute deployment
    for (var t = 0; t < tabsCount; t++) {
        var tabNum = startTab + t;
        var contentForTab = tabContents[t]; 
        
        macro += buildTabMacro(tabNum, contentForTab, launchAt, listNbr);
    }

    macro += "TAB T=1\n";
    macro += "wait seconds=2\n";

    iimPlay(macro);
}

alert("All scheduled drops executed successfully.");