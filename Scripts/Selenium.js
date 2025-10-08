// ============================================
// CONFIGURATION (Edit these values as needed)
// ============================================

// First and last tab number to process
var START_TAB = 2;
var END_TAB   = 2; 
var batch = 0;                       // Batch size
var delay = 0;                    // Delay in milliseconds

// === NEW CONFIGURATION VARIABLE ===
// Set to 'false' to work only with '6k.txt' (Tab 2)
// Set to 'true' to work with '6k.txt' (Tab 2) AND alternate 'part1.txt'/'part2.txt' (Tab 3)
var ENABLE_TAB3_DEPLOYMENT = false; 
// ==================================

// File mapping for deployment.
var files = [
    null,         // Unused
    null,         // tab 1 (unused)
    "6k.txt",     // tab 2 (Always enabled)
    "part1.txt",  // tab 3 file 1
    "part2.txt"   // tab 3 file 2
];

var deployFiles = [
    {tab2: files[2], tab3: files[3]}, // Set 1: tab2 uses 6k.txt, tab3 uses part1.txt
    {tab2: files[2], tab3: files[4]}  // Set 2: tab2 uses 6k.txt, tab3 uses part2.txt
];

// Hour Configuration for deployment
var now = new Date();
// === UPDATED: Set default hour to the current hour ===
var defaultHour = now.getHours();
var F_h = parseInt(prompt("Enter Start Hour (F_h) in 24h format:", defaultHour), 10);
var L_h = parseInt(prompt("Enter End Hour (L_h) in 24h format:", defaultHour), 10);

// Calculate the default minute and use it in the prompt
var defaultMinute = (now.getMinutes() + 2) % 60;
var M_m = parseInt(prompt("Enter a Minute (M_m) for the Launch At time:", defaultMinute), 10);

// === UTILITY FUNCTIONS ===

// HELPER: Read all lines until #EANF#
function GetAllLines(file) {
    if (!file) return ""; // Return empty string if no file is provided

    var list = [];
    var i = 1;

    while (true) {
        var macro = "CODE:";
        macro += 'SET !DATASOURCE "' + file + '"\n';
        macro += "SET !LOOP " + i + "\n";
        macro += "ADD !EXTRACT {{!COL1}}\n";
        iimPlay(macro);

        var line = iimGetLastExtract();
        if (!line || line === "#EANF#") break;

        list.push(line);
        i++;
    }

    return list.join("\\n");
}

// Zero-padding helper (since padStart is not supported)
function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

// Return formatted date string using exact input
function getDynamicLaunchAt(index) {
    var now = new Date();
    var currentHour = F_h + index;
    
    // Create a new date object with the specified time
    var launchDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour, M_m, 0);

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

// === HANDLE HOURS WRAPPING AROUND MIDNIGHT ===
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

// Loop over hours and inject file content
for (var i = 0; i < hours.length; i++) {
    var currentDeploySet = deployFiles[i % deployFiles.length]; // Alternates between sets
    var launchAt = getDynamicLaunchAt(i);
    var macro = initGlobal;

    // Process Tab 2 (ALWAYS RUNS with 6k.txt)
    var fileTab2 = currentDeploySet.tab2;
    var ipsContentTab2 = GetAllLines(fileTab2);
    macro += "TAB T=2\n";
    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + ipsContentTab2 + '"\n';
    macro += "TAG POS=21 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
    macro += "wait seconds=1\n";
    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
    macro += "wait seconds=1\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch&&NAME:system_speed[batch] CONTENT=" + batch + "\n";
    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay&&NAME:system_speed[delay] CONTENT=" + delay + "\n";
	macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";
    macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
    macro += "wait seconds=2\n";

    // Process Tab 3 (CONDITIONAL DEPLOYMENT)
    if (ENABLE_TAB3_DEPLOYMENT) {
        var fileTab3 = currentDeploySet.tab3;
        var ipsContentTab3 = GetAllLines(fileTab3);
        macro += "TAB T=3\n";
        macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=ID:rcpt_to CONTENT="' + ipsContentTab3 + '"\n';
        macro += "TAG POS=21 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
        macro += "wait seconds=1\n";
        macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
        macro += "wait seconds=1\n";
        macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch&&NAME:system_speed[batch] CONTENT=" + batch + "\n";
        macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay&&NAME:system_speed[delay] CONTENT=" + delay + "\n";
        macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";
        macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
        macro += "wait seconds=2\n";
    }

    macro += "TAB T=1\n";
    macro += "WAIT SECONDS=2\n";

    iimPlay(macro);
}