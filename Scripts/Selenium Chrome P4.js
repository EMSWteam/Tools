// =======================================================
// ================ CONFIGURATION SECTION =================
// =======================================================

// Ask user for Start Hour
var F_h = parseInt(ask("Enter Start Hour (F_h):", 13), 10);
if (isNaN(F_h) || F_h < 0 || F_h > 23) F_h = 13;

// Auto-calculate End Hour = F_h + 9 (10 hours total)
var AUTO_L_h = (F_h + 9) % 24;

// Ask user for End Hour (pre-filled with AUTO_L_h)
var L_h = parseInt(ask("Enter End Hour (L_h):", AUTO_L_h), 10);
if (isNaN(L_h) || L_h < 0 || L_h > 23) L_h = AUTO_L_h;

// Ask user for minute
var M_m = parseInt(ask("Enter Minute (M_m):", 32), 10);
if (isNaN(M_m) || M_m < 0 || M_m > 59) M_m = 32;

// FIXED batch size for first 9 hours
var FIXED_BATCH_SIZE = 200;

// Maximum batches with fixed 9 hours
var FIXED_BATCHES = 9;

// Email file name (DATA SOURCE)
var EMAIL_FILE = "selenium4.txt";

// Tab configuration (always tab 2)
var START_TAB = 2;
var END_TAB = 2;

// Execution speeds
var batchSpeed = 0;
var delaySpeed = 0;

// =======================================================
// ================ CODE START — DO NOT EDIT =============
// =======================================================

// UNIVERSAL PROMPT HANDLER
function ask(question, defaultValue) {
    try {
        if (typeof iimPrompt === "function") return iimPrompt(question, defaultValue);
        if (typeof prompt === "function") return prompt(question, defaultValue);
    } catch (e) {}
    return defaultValue;
}

// Padding helper
function pad2(n) { return (n < 10 ? "0" : "") + n; }

// Read all emails from file
function GetAllLinesArray(file) {
    var list = [], i = 1;
    while (true) {
        var macro = "CODE:";
        macro += 'SET !DATASOURCE "' + file + '"\n';
        macro += "SET !LOOP " + i + "\n";
        macro += "ADD !EXTRACT {{!COL1}}\n";
        try { iimPlay(macro); } catch (e) { break; }
        var line = iimGetLastExtract();
        if (!line || line === "#EANF#") break;
        list.push(line);
        i++;
    }
    return list;
}

// Dynamic launch time
function getDynamicLaunchAt(H, M) {
    var now = new Date();
    var launch = new Date(now.getFullYear(), now.getMonth(), now.getDate(), H, M, 0);
    if (launch.getTime() < now.getTime()) launch.setDate(launch.getDate() + 1);
    return '"' + launch.getFullYear() + "-" + pad2(launch.getMonth() + 1) + "-" +
        pad2(launch.getDate()) + " " + pad2(launch.getHours()) + ":" +
        pad2(launch.getMinutes()) + '"';
}

// iMacros base configuration
var init = "CODE:";
init += "SET !ERRORIGNORE YES\n";
init += "SET !TIMEOUT_PAGE 10\n";
init += "SET !TIMEOUT_STEP 3\n";
init += "SET !WAITPAGECOMPLETE YES\n";
init += "SET !REPLAYSPEED FAST\n";
init += "TAB T=1\n";

// Read all emails
var allEmails = GetAllLinesArray(EMAIL_FILE);
var totalEmails = allEmails.length;

if (totalEmails === 0) {
    alert("❌ No emails found in file: " + EMAIL_FILE);
    throw new Error("Empty file");
}

// ===== Build hours list: 10 hours =====
var hours = [];
if (F_h <= L_h) {
    for (var h = F_h; h <= L_h; h++) hours.push(h);
} else {
    for (var h = F_h; h < 24; h++) hours.push(h);
    for (var h = 0; h <= L_h; h++) hours.push(h);
}

// Force exactly 10 hours
hours = hours.slice(0, 10);

// ===== Prepare batches =====
var batches = [];

// First 9 batches = 200 emails each
for (var i = 0; i < FIXED_BATCHES; i++) {
    var startIndex = i * FIXED_BATCH_SIZE;
    var endIndex = startIndex + FIXED_BATCH_SIZE;

    if (startIndex >= totalEmails) break;

    batches.push({
        hour: hours[i],
        emails: allEmails.slice(startIndex, Math.min(endIndex, totalEmails))
    });
}

// Last batch = remaining emails
var remainingStart = FIXED_BATCHES * FIXED_BATCH_SIZE;
var remainingEmails = allEmails.slice(remainingStart);

if (remainingEmails.length > 0) {
    batches.push({
        hour: hours[FIXED_BATCHES],
        emails: remainingEmails
    });
}

// ===== Execute deployment =====
for (var b = 0; b < batches.length; b++) {

    var emailBatch = batches[b].emails.join("\\n");
    var launchAt = getDynamicLaunchAt(batches[b].hour, M_m);

    var macro = init;
    macro += "TAB T=" + START_TAB + "\n";
	macro += "TAG POS=1 TYPE=INPUT:CHECKBOX FORM=ID:deploy-form ATTR=ID:rcpt-to-switcher CONTENT=YES\n";
    macro += "WAIT SECONDS=1\n";
    macro += 'TAG POS=1 TYPE=TEXTAREA FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + emailBatch + '"\n';
    macro += "TAG POS=21 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
    macro += "WAIT SECONDS=1\n";
    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
    macro += "WAIT SECONDS=1\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch CONTENT=" + batchSpeed + "\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay CONTENT=" + delaySpeed + "\n";
    macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";
    macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
    macro += "WAIT SECONDS=1\n";
    macro += "TAB T=1\n"

    iimPlay(macro);
}

alert("✅ Deployment Complete!\nTotal emails: " + totalEmails + "\nBatches: " + batches.length);
