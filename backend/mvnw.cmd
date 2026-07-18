@echo off
setlocal
set "MAVEN_VERSION=3.9.11"
set "MAVEN_HOME=%~dp0.mvn\apache-maven-%MAVEN_VERSION%"
if not exist "%MAVEN_HOME%\bin\mvn.cmd" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; $v='%MAVEN_VERSION%'; $root='%~dp0.mvn'; New-Item -ItemType Directory -Force -Path $root | Out-Null; $zip=Join-Path $root ('apache-maven-'+$v+'-bin.zip'); Invoke-WebRequest -Uri ('https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/'+$v+'/apache-maven-'+$v+'-bin.zip') -OutFile $zip; Expand-Archive -Force -Path $zip -DestinationPath $root; Remove-Item $zip"
  if errorlevel 1 exit /b 1
)
call "%MAVEN_HOME%\bin\mvn.cmd" %*
