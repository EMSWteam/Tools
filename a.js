document.getElementById("generateShifts").addEventListener("click", function () {
    const shifts = [
        { time: "00:00 - 00:00", color: "yellow" }, // Day Off
        { time: "09:00 - 17:00", color: "green" },  // Day Shift
        { time: "15:00 - 23:00", color: "blue" }    // Night Shift
    ];
    const tables = ["webProjectTable", "automathProjectTable"];

    tables.forEach((tableId) => {
        const table = document.getElementById(tableId);
        const rows = table.querySelectorAll("tbody tr");

        rows.forEach((row) => {
            const cells = row.querySelectorAll("td.editable");
            let dayOffStart = Math.floor(Math.random() * 6); // Randomly choose a day to start day-offs
            cells.forEach((cell, index) => {
                let shift;
                if (index === dayOffStart || index === dayOffStart + 1) {
                    shift = shifts[0]; // Assign "00:00 - 00:00" (Day Off)
                } else {
                    shift = shifts[Math.floor(Math.random() * 2) + 1]; // Assign random Day/Night Shift
                }

                cell.textContent = shift.time;
                cell.style.backgroundColor = shift.color;
            });
        });
    });
});

// Allow manual editing of cells with color update
document.querySelectorAll("td.editable").forEach((cell) => {
    cell.addEventListener("click", function () {
        const currentText = cell.textContent;
        const newText = prompt(
            "Enter new shift (e.g., 09:00 - 17:00, 15:00 - 23:00, or 00:00 - 00:00):",
            currentText
        );
        if (newText !== null) {
            cell.textContent = newText;

            // Update color based on shift
            if (newText === "00:00 - 00:00") cell.style.backgroundColor = "yellow";
            else if (newText === "09:00 - 17:00") cell.style.backgroundColor = "green";
            else if (newText === "15:00 - 23:00") cell.style.backgroundColor = "blue";
            else cell.style.backgroundColor = ""; // Clear background for invalid entries
        }
    });
});
