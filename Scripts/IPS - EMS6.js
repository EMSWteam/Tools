// ============================================
// CONFIGURATION (Edit these values as needed)
// ============================================

// First and last tab number to process
var START_TAB = 2;
var END_TAB   = 6;

// File mapping: Index matches tab number
var files = [
    null,
    null,         // tab 1 (unused)
    "ips1EMS6.txt",   // tab 2
    "ips2EMS6.txt",   // tab 3
    "ips3EMS6.txt",   // tab 4
    "ips4EMS6.txt",   // tab 5
    "ips5EMS6.txt",   // tab 6
    "ips6EMS6.txt",   // tab 7
    "ips7EMS6.txt",   // tab 8
    "ips8EMS6.txt",   // tab 9
    "ips9EMS6.txt",   // tab 10
    "ips10EMS6.txt"   // tab 11
];

// ============================================
// HELPER: Read all lines until #EANF#
// ============================================

function GetAllLines(file) {
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

// ============================================
// MAIN SCRIPT
// ============================================

var initGlobal = "CODE:";
initGlobal += "SET !ERRORIGNORE YES\n";
initGlobal += "SET !TIMEOUT_STEP 3\n";
initGlobal += "SET !TIMEOUT_PAGE 10\n";
initGlobal += "SET !WAITPAGECOMPLETE YES\n";
initGlobal += "SET !REPLAYSPEED FAST\n";

var macro = initGlobal;
macro += "WAIT SECONDS=1\n";

// Loop over tabs and inject file content
for (var tab = START_TAB; tab <= END_TAB; tab++) {
    var file = files[tab];
    if (!file) continue;

    var ipsContent = GetAllLines(file);

    macro += "TAB T=" + tab + "\n";
    macro += 'TAG POS=1 TYPE=TEXTAREA FORM=ID:deploy-form ATTR=ID:servers_by_providers_ms-select-search-option CONTENT="' + ipsContent + '"\n';
    macro += 'TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=ID:servers_by_providers_ms-select\n';
}

macro += "TAB T=1\n";
macro += "WAIT SECONDS=2\n";

iimPlay(macro);
