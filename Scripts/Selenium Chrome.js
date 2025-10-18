// ============================================
// MODIFIED CONFIGURATION
// ============================================

// First and last tab number to process
var START_TAB = 2; // Start at Tab 2 
var END_TAB = 6; // End at Tab 6 (Maintains 5 tabs total: 2, 3, 4, 5, 6)
var BATCH_SIZE = 20; // Number of emails per tab
var EMAIL_FILE = "1k400.txt"; // The file containing 1400 emails
var TABS_TO_USE = END_TAB - START_TAB + 1; // Calculated as 5

// Other original config variables
var batch = 0; // System speed: Batch size
var delay = 0; // System speed: Delay in milliseconds
var ENABLE_TAB3_DEPLOYMENT = false; // Disabled old logic
// ==================================

// Hour Configuration (Using user input 12, 1, 32)
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
var L_h = parseInt(ask("Enter End Hour (L_h) in 24h format:", 1), 10);
var M_m = parseInt(ask("Enter a Minute (M_m) for the Launch At time:", 32), 10);

// === UTILITY FUNCTIONS ===

// Read all lines from a text file using iMacros datasource method
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

// Zero-padding helper
function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

// Return formatted date string using a SPECIFIC hour (H) and minute (M)
function getDynamicLaunchAt(H, M) {
    var now = new Date();

    // Create a new date object with the specified time
    var launchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), H, M, 0);

    // If the calculated time is in the past, add one day
    if (launchDate.getTime() < now.getTime()) {
        launchDate.setDate(launchDate.getDate() + 1);
    }

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
initGlobal += "TAB T=1\n";

// 1. READ ALL EMAILS
var allEmails = [];
try {
    allEmails = GetAllLinesArray(EMAIL_FILE);
} catch (e) {
    alert("⚠️ Error reading file: " + EMAIL_FILE);
}

var totalEmails = allEmails.length;
if (totalEmails === 0) {
    alert("Error: No emails found in " + EMAIL_FILE);
}

// 2. GENERATE HOUR SEQUENCE (e.g., 12, 13, ..., 23, 0, 1)
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

// Calculate total batches required
var totalBatches = Math.ceil(totalEmails / BATCH_SIZE);

// 3. Loop over all batches
for (var i = 0; i < totalBatches; i++) {

    // Determine the current tab (Cycles 2, 3, 4, 5, 6)
    var currentTab = START_TAB + (i % TABS_TO_USE);

    // Determine the current hour based on cycle
    var hourIndex = Math.floor(i / TABS_TO_USE) % totalHours;
    var currentHour = hours[hourIndex];

    // Calculate email range
    var startIndex = i * BATCH_SIZE;
    var endIndex = Math.min(startIndex + BATCH_SIZE, totalEmails);
    var emailBatch = allEmails.slice(startIndex, endIndex).join("\\n");
    if (emailBatch.length === 0) break;

    // Get the dynamic launch time
    var launchAt = getDynamicLaunchAt(currentHour, M_m);

    // Build macro string
    var macro = initGlobal;
    macro += "TAB T=" + currentTab + "\n";
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
    macro += "WAIT SECONDS=2\n";
    macro += "TAB T=1\n";
    macro += "WAIT SECONDS=2\n";

    try {
        iimPlay(macro);
    } catch (e) {
        alert("Batch " + (i + 1) + " failed: " + e.message);
    }
}

alert("✅ Deployment script finished.\nTotal batches processed: " + i + " batches of " + BATCH_SIZE + " emails.");
