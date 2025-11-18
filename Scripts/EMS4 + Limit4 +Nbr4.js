// === AUTO-SET DEFAULT HOURS BASED ON SYSTEM TIME (+1) ===
var now = new Date();
var defaultHour = (now.getHours() + 1) % 24;  // next hour in 24h format

// Prompt user with default values
var F_h = parseInt(prompt("Enter Start Hour (F_h) in 24h format:", defaultHour), 10);
var L_h = parseInt(prompt("Enter End Hour (L_h) in 24h format:", defaultHour), 10);

// === CHOOSE LIMIT SOURCE MODE ===
var limitSource = prompt("Choose limit mode:\n1 = Total from limit.txt (split across tabs)\n2 = Per-tab from Nbr.txt", "1");

// === CONFIGURATION PARAMETERS ===
var Limit_File = "limit4.txt";        // File containing total limits per hour
var Nbr_File = "Nbr4.txt";            // File containing exact limits per tab
var batch = 3;                        // Batch size
var delay = 3000;                     // Delay in milliseconds
var tabsCount = 5;                    // Number of tabs to use
var startTab = 2;                     // First tab number

// === UTILITY FUNCTIONS ===

// Zero-padding helper (works in old JS)
function pad2(n) {
    return (n < 10 ? "0" : "") + n;
}

// Map hour to row number in file (row 1 = hour 11)
function mapHourToRow(hour) {
    if (hour >= 11 && hour <= 23) {
        return hour - 10;          // 11→1 ... 23→13
    } else {
        return (hour + 24) - 10;   // 0→14 ... 10→24
    }
}

// Map row to listNbr (start from 15 if needed)
function mapRowToListNbr(row) {
    return row + 0;
}

// Return formatted date string based on hour shift
function getDynamicLaunchAt(index) {
    var hourInput = F_h + index;
    var launchHour = (hourInput + 23) % 24;
    var addDay = (launchHour >= 0 && launchHour <= 9) ? 1 : 0;

    var now = new Date();
    now.setDate(now.getDate() + addDay);

    var yyyy = now.getFullYear();
    var mm = pad2(now.getMonth() + 1);
    var dd = pad2(now.getDate());
    var hh = pad2(launchHour);

    return '"' + yyyy + '-' + mm + '-' + dd + ' ' + hh + ':55"';  // launch at hh:55
}

// === READ TOTAL LIMIT FROM limit.txt AND DISTRIBUTE ===
function getLimitFromFile(row) {
    var macro = "CODE:";
    macro += "SET !DATASOURCE " + Limit_File + "\n";
    macro += "SET !LOOP " + row + "\n";
    macro += "ADD !EXTRACT {{!COL1}}\n";

    iimPlay(macro);
    var extracted = iimGetLastExtract();
    var total = parseInt(extracted) || 16;

    var base = Math.floor(total / tabsCount);
    var remainder = total % tabsCount;

    var limits = [];
    for (var i = 0; i < tabsCount; i++) {
        limits.push(base + (i < remainder ? 1 : 0));
    }
    return limits;
}

// === READ INDIVIDUAL LIMITS FROM Nbr.txt PER TAB ===
function getTabLimitsFromNbrFile() {
    var macro;
    var limits = [];

    for (var i = 0; i < tabsCount; i++) {
        macro = "CODE:";
        macro += "SET !DATASOURCE " + Nbr_File + "\n";
        macro += "SET !DATASOURCE_LINE " + (i + 1) + "\n";  // Always start from line 1 for tab 1
        macro += "ADD !EXTRACT {{!COL1}}\n";

        iimPlay(macro);
        var value = parseInt(iimGetLastExtract()) || 0;
        limits.push(value);
    }
    return limits;
}

// === BUILD MACRO FOR EACH TAB ===
function buildTabMacro(tabNum, hour, limit, offset, launchAt, listNbr) {
    var macro = "TAB T=" + tabNum + "\n";
    macro += "wait seconds=1\n";

    macro += "TAG POS=5 TYPE=BUTTON ATTR=TXT:Close\n";
    macro += "wait seconds=1\n";

    macro += "TAG POS=1 TYPE=A ATTR=ID:profile_isp-deselect-all\n";
    macro += "wait seconds=1\n";

    macro += "TAG POS=7 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Search..&&TYPE:text CONTENT=RepoIPs_webautomat_v2_" + listNbr + "_\n";
    macro += "wait seconds=2\n";

    macro += "TAG POS=1 TYPE=A ATTR=ID:profile_isp-multi-select-all\n";
    macro += "wait seconds=1\n";

    macro += "TAG POS=13 TYPE=SPAN ATTR=CLASS:bootstrap-switch-handle-off<SP>bootstrap-switch-danger&&TXT:No\n";
    macro += "wait seconds=1\n";

    macro += 'TAG POS=1 TYPE=INPUT:TEXT FORM=ID:deploy-form ATTR=PLACEHOLDER:Launch<SP>At&&NAME:launch_at CONTENT=' + launchAt + '\n';
    macro += "wait seconds=1\n";

    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:offset&&NAME:limit_offset[offset] CONTENT=" + offset + "\n";

    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:limit&&NAME:limit_offset[limit] CONTENT=" + limit + "\n";

    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:test_after&&NAME:test_after CONTENT=10000000\n";

    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:batch&&NAME:system_speed[batch] CONTENT=" + batch + "\n";

    macro += "TAG POS=1 TYPE=INPUT:NUMBER FORM=ID:deploy-form ATTR=ID:delay&&NAME:system_speed[delay] CONTENT=" + delay + "\n";

    macro += "TAG POS=1 TYPE=SELECT FORM=ID:deploy-form ATTR=ID:send_mode&&NAME:send_mode CONTENT=%non_blocking\n";

    macro += "TAG POS=1 TYPE=BUTTON FORM=ID:deploy-form ATTR=TYPE:submit&&CLASS:btn<SP>btn-default<SP>submit&&DATA-ACTION-TYPE:test_ips&&VALUE:test_ips&&NAME:action_type\n";
    macro += "wait seconds=2\n";

    return macro;
}

// === GLOBAL iMacros HEADER ===
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

// === MAIN EXECUTION LOOP ===
for (var idx = 0; idx < hours.length; idx++) {
    var j = hours[idx];
    var row = mapHourToRow(j);
    var listNbr = mapRowToListNbr(row);

    iimDisplay("Hour: " + j + "\nRow: " + row + "\nListNbr: " + listNbr);

    var limits;
    if (limitSource === "2") {
        limits = getTabLimitsFromNbrFile(row);
    } else {
        limits = getLimitFromFile(row);
    }

    var launchAt = getDynamicLaunchAt(idx);
    var offset = 0;
    var macro = initGlobal;

    macro += "SET !LOOP " + row + "\n";
    macro += "wait seconds=1\n";

    for (var t = 0; t < tabsCount; t++) {
        var tabNum = startTab + t;
        var currentLimit = limits[t];
        macro += buildTabMacro(tabNum, j, currentLimit, offset, launchAt, listNbr);
        offset += currentLimit;
    }

    macro += "TAB T=1\n";
    macro += "wait seconds=2\n";

    iimPlay(macro);
}
