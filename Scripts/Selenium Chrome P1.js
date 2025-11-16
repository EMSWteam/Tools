// ============================================
// FINAL CONFIGURATION (Tabs 2 through 6)
// ============================================

// First and last tab number to process
var START_TAB = 2; // Start at Tab 2 
var END_TAB = 6; // End at Tab 6 (Maintains 5 tabs total: 2, 3, 4, 5, 6)
var BATCH_SIZE = 14; // Number of emails per tab
var TABS_TO_USE = END_TAB - START_TAB + 1; // Calculated as 5

// --- LIST OF ALL AVAILABLE FILES ---
var ALL_FILES = [
    "Selenium1_D1.txt", "Selenium1_D2.txt", "Selenium1_D3.txt", "Selenium1_D4.txt", 
    "Selenium1_D5.txt", "Selenium1_D6.txt", "Selenium1_D7.txt", "Selenium1_D8.txt", 
    "Selenium1_D9.txt", "Selenium1_D10.txt"
];
// ==================================

// Other original config variables
var batch = 0; // System speed: Batch size
var delay = 0; // System speed: Delay in milliseconds
var ENABLE_TAB3_DEPLOYMENT = false; // Disabled old logic

// Hour Configuration 
var now = new Date();
var defaultHour = now.getHours();
var defaultMinute = (now.getMinutes() + 2) % 60;

// === UNIVERSAL PROMPT HANDLER ===
function ask(question, defaultValue) {
    try {
        if (typeof iimPrompt === "function") {
            return iimPrompt(question, defaultValue);
        } else if (typeof prompt === "function") {
            return prompt(question, defaultValue);
        } else {
            return defaultValue;
        }
    } catch (e) {
        return defaultValue;
    }
}

// Hour input configuration
var F_h = parseInt(ask("Enter Start Hour (F_h) in 24h format:", 12), 10);
var L_h = parseInt(ask("Enter End Hour (L_h) in 24h format:", 16), 10);
var M_m = parseInt(ask("Enter a Minute (M_m) for the Launch At time:", 30), 10);

// --- DYNAMIC FILE SELECTION LOGIC ---
var filePrompt = 
"Choose the STARTING Email File (1-10):\n" +
"1: Selenium1_D1\n2: Selenium1_D2\n3: Selenium1_D3\n" +
"4: Selenium1_D4\n5: Selenium1_D5\n6: Selenium1_D6\n" +
"7: Selenium1_D7\n8: Selenium1_D8\n9: Selenium1_D9\n10: Selenium1_D10";

var fileSelection = parseInt(ask(filePrompt, 1), 10);
if (fileSelection < 1 || fileSelection > 10) {
    fileSelection = 1; // Default to D1 if input is invalid
}

// 1. GENERATE HOUR SEQUENCE
var hours = [];
if (F_h <= L_h) {
    for (var h = F_h; h <= L_h; h++) {
        hours.push(h);
    }
} else {
    for (var h = F_h; h < 24; h++) {
        hours.push(h);
    }
    for (var h = 0; h <= L_h; h++) {
        hours.push(h);
    }
}
var totalHours = hours.length;

// 2. DYNAMICALLY CREATE FILES_TO_PROCESS ARRAY
var FILES_TO_PROCESS = [];
var startIndex = fileSelection - 1; // Array index starts at 0

for (var i = 0; i < totalHours; i++) {
    // Cycle through ALL_FILES using modulo 10
    var fileIndex = (startIndex + i) % ALL_FILES.length;
    FILES_TO_PROCESS.push(ALL_FILES[fileIndex]);
}

var maxFilesToProcess = Math.min(FILES_TO_PROCESS.length, totalHours);

// --- ALERT SHOWING FILE-TO-HOUR MAPPING (Initial Confirmation) ---
var scheduleAlert = "Deployment Schedule (1 File per Hour):\n" +
                    "Tabs Used: " + START_TAB + " to " + END_TAB + " (" + TABS_TO_USE + " total)\n" +
                    "Starting File: " + ALL_FILES[startIndex] + "\n\n";

for (var i = 0; i < maxFilesToProcess; i++) {
    var h = hours[i];
    var padHour = (h < 10 ? "0" : "") + h;
    var padMinute = (M_m < 10 ? "0" : "") + M_m;
    
    scheduleAlert += padHour + ":" + padMinute + " -> " + FILES_TO_PROCESS[i] + "\n";
}

if (FILES_TO_PROCESS.length > totalHours) {
    scheduleAlert += "\n⚠️ WARNING: Not enough hours (" + totalHours + ") defined to cover all files (" + FILES_TO_PROCESS.length + "). Only the first " + totalHours + " files will be processed.";
}

alert(scheduleAlert);

// === UTILITY FUNCTIONS ===
function GetAllLinesArray(file) {
    if (!file) return [];
    var list = [];
    var i = 1;
    while (true) {
        var macro = "CODE:";
        macro += 'SET !DATASOURCE "' + file + '"\n';
        macro += "SET !LOOP " + i + "\n";
        macro += "ADD !EXTRACT {{!COL1}}\n";
        try {
            iimPlay(macro);
        } catch (e) {
            break;
        }
        var line = iimGetLastExtract ? iimGetLastExtract() : null;
        if (!line || line === "#EANF#") break;
        list.push(line);
        i++;
    }
    return list;
}

function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

function getDynamicLaunchAt(H, M) {
    var now = new Date();
    // Creates a date object for the current day, using the specified H and M.
    var launchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), H, M, 0);
    
    // --- MODIFICATION: COMMENTED OUT DATE ADVANCEMENT LOGIC ---
    /*
    if (launchDate.getTime() < now.getTime()) {
        launchDate.setDate(launchDate.getDate() + 1);
    }
    */
    // -----------------------------------------------------------

    var yyyy = launchDate.getFullYear();
    var mm = pad2(launchDate.getMonth() + 1);
    var dd = pad2(launchDate.getDate());
    var hh = pad2(launchDate.getHours());
    var min = pad2(launchDate.getMinutes());
    return '"' + yyyy + '-' + mm + '-' + dd + ' ' + hh + ':' + min + '"';
}

// === MAIN SCRIPT ===

var initGlobal = "CODE:";
initGlobal += "SET !ERRORIGNORE YES\n";
initGlobal += "SET !TIMEOUT_STEP 3\n";
initGlobal += "SET !TIMEOUT_PAGE 10\n";
initGlobal += "SET !WAITPAGECOMPLETE YES\n";
initGlobal += "SET !REPLAYSPEED FAST\n";
// initGlobal += "TAB T=1\n"; // Removed from initGlobal to allow it to be placed inside the macro for better control

var totalBatchesProcessed = 0;

// 3. Loop over the files to process (1 file per hour)
for (var fileIndex = 0; fileIndex < maxFilesToProcess; fileIndex++) {
    
    var currentFile = FILES_TO_PROCESS[fileIndex];
    var currentLaunchHour = hours[fileIndex];

    // 3A. READ EMAILS FOR THIS FILE
    var allEmails = [];
    try {
        allEmails = GetAllLinesArray(currentFile);
    } catch (e) {
        alert("⚠️ Error reading file: " + currentFile);
        continue; // Skip to the next file
    }

    var totalEmails = allEmails.length;
    if (totalEmails === 0) {
        alert("Error: No emails found in " + currentFile);
        continue; // Skip to the next file
    }

    var totalBatchesForFile = Math.ceil(totalEmails / BATCH_SIZE);

    // 3B. Loop over all batches for the current file
    for (var i = 0; i < totalBatchesForFile; i++) {

        // Determine the current tab (Cycles 2, 3, 4, 5, 6)
        var currentTab = START_TAB + (i % TABS_TO_USE); 

        // Calculate email range
        var startIndex = i * BATCH_SIZE;
        var endIndex = Math.min(startIndex + BATCH_SIZE, totalEmails);
        var emailBatch = allEmails.slice(startIndex, endIndex).join("\\n");
        if (emailBatch.length === 0) break;

        // Get the dynamic launch time (all batches from this file use the same hour)
        var launchAt = getDynamicLaunchAt(currentLaunchHour, M_m);

        // Build macro string
    var macro = initGlobal;
    macro += "TAB T=" + currentTab + "\n";
	macro += "TAG POS=5 TYPE=BUTTON ATTR=TXT:Close\n";
	macro += "TAG POS=1 TYPE=INPUT:CHECKBOX FORM=ID:deploy-form ATTR=ID:rcpt-to-switcher CONTENT=YES\n";
	macro += "WAIT SECONDS=1\n";
    // macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + emailBatch + '"\n';
	macro += 'TAG POS=1 TYPE=TEXTAREA FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + emailBatch + '"\n';
    macro += "TAG POS=21 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
    macro += "WAIT SECONDS=1\n";
    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
    macro += "WAIT SECONDS=1\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch&&NAME:system_speed[batch] CONTENT=" + batch + "\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay&&NAME:system_speed[delay] CONTENT=" + delay + "\n";
    macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";
    macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
    macro += "WAIT SECONDS=1\n";
    macro += "TAB T=1\n";

        try {
            iimPlay(macro);
        } catch (e) {
            alert("Batch " + (totalBatchesProcessed + 1) + " failed: " + e.message + " (File: " + currentFile + ")");
        }
        totalBatchesProcessed++;
    }
}

alert("✅ Deployment script finished.\nTotal batches processed: " + totalBatchesProcessed + " batches from " + maxFilesToProcess + " files.");