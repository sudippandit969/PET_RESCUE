$filePath = "UserDashboard.js"
$content = Get-Content -Path $filePath -Raw

# Define the pattern to match using regex
$pattern = '(?ms)\s*\{\s*/\*\s*New Section for Feedback List\s*\*/\s*\}\s*\{activeTab !== "feedbacks" && \(\s*<section.*?Community Voices.*?</section>\s*\)\}'

# Replace with a comment
$replacement = "`n              {/* Community Voices section has been removed */}"

# Apply the replacement
$newContent = $content -replace $pattern, $replacement

# Write back to file
$newContent | Set-Content -Path $filePath -NoNewline