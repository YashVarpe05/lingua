param(
	[Parameter(Mandatory = $true)]
	[string]$ProjectId,

	[string]$Region = "us-east1",
	[string]$ServiceName = "lingua-vision-agent",
	[int]$MinInstances = 1,
	[string]$Memory = "1Gi",
	[string]$Cpu = "1",
	[string]$Timeout = "3600s",
	[switch]$SkipEasEnv
)

$ErrorActionPreference = "Stop"

function Get-GcloudCommand {
	$portable = Join-Path $env:LOCALAPPDATA "GoogleCloudSDKPortable\google-cloud-sdk\bin\gcloud.cmd"
	if (Test-Path $portable) {
		return $portable
	}

	$command = Get-Command gcloud -ErrorAction SilentlyContinue
	if ($command) {
		return $command.Source
	}

	throw "gcloud was not found. Install Google Cloud CLI or use the portable SDK path."
}

function Ensure-Secret {
	param(
		[Parameter(Mandatory = $true)]
		[string]$Name,

		[Parameter(Mandatory = $true)]
		[string]$EnvVar
	)

	$value = [Environment]::GetEnvironmentVariable($EnvVar)
	if ([string]::IsNullOrWhiteSpace($value)) {
		throw "Missing `$env:$EnvVar. Set it before running this script."
	}

	$exists = & $gcloud secrets describe $Name --project $ProjectId --format "value(name)" 2>$null
	$tempFile = Join-Path $env:TEMP "$Name.txt"

	try {
		Set-Content -LiteralPath $tempFile -Value $value -NoNewline

		if ([string]::IsNullOrWhiteSpace($exists)) {
			& $gcloud secrets create $Name --project $ProjectId --replication-policy automatic --data-file $tempFile | Out-Null
		}
		else {
			& $gcloud secrets versions add $Name --project $ProjectId --data-file $tempFile | Out-Null
		}
	}
	finally {
		Remove-Item -LiteralPath $tempFile -Force -ErrorAction SilentlyContinue
	}
}

$gcloud = Get-GcloudCommand
if ([string]::IsNullOrWhiteSpace($env:CLOUDSDK_PYTHON)) {
	$env:CLOUDSDK_PYTHON = "C:\Users\yashv\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
}

& $gcloud config set project $ProjectId | Out-Null
& $gcloud services enable `
	run.googleapis.com `
	cloudbuild.googleapis.com `
	artifactregistry.googleapis.com `
	secretmanager.googleapis.com `
	--project $ProjectId | Out-Null

Ensure-Secret -Name "lingua-stream-api-key" -EnvVar "STREAM_API_KEY"
Ensure-Secret -Name "lingua-stream-api-secret" -EnvVar "STREAM_API_SECRET"
Ensure-Secret -Name "lingua-gemini-api-key" -EnvVar "GEMINI_API_KEY"

& $gcloud run deploy $ServiceName `
	--source "vision-agent" `
	--project $ProjectId `
	--region $Region `
	--allow-unauthenticated `
	--set-secrets "STREAM_API_KEY=lingua-stream-api-key:latest,STREAM_API_SECRET=lingua-stream-api-secret:latest,GEMINI_API_KEY=lingua-gemini-api-key:latest" `
	--min-instances $MinInstances `
	--no-cpu-throttling `
	--memory $Memory `
	--cpu $Cpu `
	--timeout $Timeout

$serviceUrl = & $gcloud run services describe $ServiceName --project $ProjectId --region $Region --format "value(status.url)"

if ([string]::IsNullOrWhiteSpace($serviceUrl)) {
	throw "Cloud Run deployed, but service URL was not returned."
}

Write-Host "Vision Agent URL: $serviceUrl"

if (!$SkipEasEnv) {
	npx eas-cli@latest env:create production `
		--name VISION_AGENT_BASE_URL `
		--value $serviceUrl `
		--visibility plaintext `
		--force `
		--non-interactive
}
