# Dark Mode Implementation Guide

## Current Status

✅ Theme toggle button added to both dashboards  
✅ Background and header respond to dark mode  
⚠️ Content cards and sections need dark mode styling

## Quick Fix Solution

Since there are many cards and sections to update, here's the most efficient approach:

### Option 1: Add a wrapper class (Recommended - Fastest)

Add this to your component return statement at the top level:

```javascript
return (
  <div className={isDarkMode ? "dark" : ""}>{/* All your existing code */}</div>
);
```

Then use Tailwind's dark: prefix for all elements:

- `bg-white` → `bg-white dark:bg-gray-800`
- `text-gray-600` → `text-gray-600 dark:text-gray-300`
- `border-purple-200` → `border-purple-200 dark:border-purple-700`

### Option 2: Template literal approach (Current implementation)

Replace all static className strings with template literals that check `isDarkMode`:

```javascript
className={`rounded-xl p-6 ${
  isDarkMode
    ? 'bg-gray-800 text-gray-300 border-gray-700'
    : 'bg-white text-gray-600 border-purple-200'
}`}
```

## Files to Update

1. **AdminDashboard.js**

   - All stat cards (lines 805-975)
   - All section containers (~20 instances)
   - Pet cards and reports
   - Modals

2. **UserDashboard.js**
   - Same pattern as AdminDashboard

## Common Patterns to Replace

| Light Mode          | Dark Mode           |
| ------------------- | ------------------- |
| `bg-white`          | `bg-gray-800`       |
| `bg-purple-50`      | `bg-purple-900/30`  |
| `bg-indigo-50`      | `bg-indigo-900/30`  |
| `text-gray-600`     | `text-gray-300`     |
| `text-gray-500`     | `text-gray-400`     |
| `border-purple-200` | `border-purple-700` |

## Automated Replacement Script

Run this PowerShell script to update all cards at once:

```powershell
$file = "d:\All Projects\PET_RESCUE1\pet-rescue-frontend\src\pages\AdminDashboard.js"
$content = Get-Content $file -Raw

# Replace common patterns
$patterns = @{
    'className="bg-white ' = 'className={`${isDarkMode ? "bg-gray-800 " : "bg-white "}'
    ' text-gray-600' = ' ${isDarkMode ? "text-gray-300" : "text-gray-600"}'
    'rounded-2xl shadow-xl p-8 border-2 border-purple-200"' = 'rounded-2xl shadow-xl p-8 border-2 ${isDarkMode ? "border-purple-700" : "border-purple-200"}`}'
}

foreach ($pattern in $patterns.GetEnumerator()) {
    $content = $content -replace [regex]::Escape($pattern.Key), $pattern.Value
}

Set-Content $file $content
```

## Next Steps

1. Enable Tailwind dark mode in `tailwind.config.js`:

```javascript
module.exports = {
  darkMode: "class", // Enable class-based dark mode
  // ... rest of config
};
```

2. Apply dark mode classes systematically
3. Test all sections in both modes
4. Adjust colors for better contrast in dark mode

## Quick Test

After implementing, toggle the theme button and check:

- ✅ Background changes
- ✅ Header changes
- ✅ Stat cards change colors
- ✅ Text remains readable
- ✅ Borders are visible
