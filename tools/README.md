# Tools

## aria2

aria2 1.37.0 (64-bit) is included for faster ZIM downloads.

**Location:** `aria2-1.37.0-win-64bit-build1/aria2c.exe`

**Usage (faster Wikipedia ZIM download):**
```powershell
$zimDir = "$env:APPDATA\UStud\content\zim"
New-Item -ItemType Directory -Path $zimDir -Force
.\aria2-1.37.0-win-64bit-build1\aria2c.exe -x 16 -s 16 -c -d $zimDir "https://download.kiwix.org/zim/wikipedia/wikipedia_en_simple_all_mini_2026-02.zim"
```

**Add to PATH (optional):** Add the `aria2-1.37.0-win-64bit-build1` folder to your system PATH to use `aria2c` from anywhere.
