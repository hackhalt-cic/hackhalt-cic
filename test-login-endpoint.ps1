# Test script to verify /api/auth/login endpoint returns JSON
$uri = "http://localhost:5000/api/auth/login"
$body = @{
    username = "testuser"
    password = "testpass"
} | ConvertTo-Json

Write-Host "Testing login endpoint..."
Write-Host "URL: $uri"
Write-Host "Method: POST"
Write-Host "Body: $body"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri $uri -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    Write-Host "Status Code: $($response.StatusCode)"
    Write-Host "Content-Type: $($response.Headers['Content-Type'])"
    Write-Host "Response Body:" 
    Write-Host $response.Content
} catch {
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)"
    Write-Host "Response:" 
    Write-Host $_.Exception.Response.Content
}
