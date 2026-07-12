import fs from 'fs';

const src = "C:\\Users\\CLB\\.gemini\\antigravity\\brain\\2e9f49ab-1d71-4b1d-a7c1-64076367e71c\\media__1783841523502.png";
const dest = "c:\\Users\\CLB\\Desktop\\ASTU-STEAM-FINAL-PROJECT\\frontend\\public\\astu_gate.png";

try {
    fs.copyFileSync(src, dest);
    console.log("Success copying background image");
} catch (err) {
    console.error("Error copying background image:", err);
}
