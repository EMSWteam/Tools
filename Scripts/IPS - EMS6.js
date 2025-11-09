// ============================================
// CONFIGURATION (Edit these values as needed)
// ============================================

// First and last tab number to process
var START_TAB = 2;
var END_TAB   = 6;

// Base file name structure: ipsXEMS6.txt where X is the number of the tab (minus 1, starting from 1)
var BASE_FILENAME = "ips${X}EMS6";

// ============================================
// GET USER INPUT
// ============================================

var choice = prompt(
    "Please choose a file type:\n" +
    "1 : Repo \n" +
    "2 : Selenium \n" +
    "3 : Brave ",
    "1" // Default value
);

var suffix = "";
if (choice === "2") {
    suffix = "_Selenium";
} else if (choice === "3") {
    suffix = "_Brave";
} else if (choice !== "1") {
    alert("Invalid choice. Defaulting to 1 (Repo).");
    choice = "1";
}

// Dynamically generate the file mapping based on the choice
var files = [null, null]; // Start with null for tabs 0 and 1
for (var i = START_TAB; i <= END_TAB; i++) {
    // X will be i - 1, ranging from 1 to 10
    var X = i - 1; 
    
    // Construct the file name, e.g., ips1EMS6.txt, ips1EMS6_Selenium.txt, etc.
    var filename = BASE_FILENAME.replace("${X}", X) + suffix + ".txt";
    files.push(filename);
}

// Check the generated files array (optional: for debugging)
// alert("Files to be processed:\n" + files.slice(START_TAB).join("\n"));

// ============================================
// HELPER: Read all lines until #EANF#
// ============================================
// NOTE: This function's content remains unchanged, as it is robust.

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

    // Use \\n for iMacros line breaks when injecting into a text area
    return list.join("\\n");
}

// ============================================
// MAIN SCRIPT EXECUTION
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
    // Check if the file is correctly generated and not null
    if (!file) continue; 

    // The function will attempt to read the specified file (e.g., ips1EMS6_Selenium.txt)
    var ipsContent = GetAllLines(file);

    macro += "TAB T=" + tab + "\n";
    // NOTE: Replace 'servers_by_providers_ms-select-search-option' and 'servers_by_providers_ms-select'
    // with your actual element IDs if they are different in your application.
    macro += 'TAG POS=1 TYPE=TEXTAREA FORM=ID:deploy-form ATTR=ID:servers_by_providers_ms-select-search-option CONTENT="' + ipsContent + '"\n';
    macro += 'TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=ID:servers_by_providers_ms-select\n';
}

macro += "TAB T=1\n";
macro += "WAIT SECONDS=1\n";

iimPlay(macro);
