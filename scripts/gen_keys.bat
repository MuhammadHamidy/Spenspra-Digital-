@echo off
if not exist "scripts\.gocache" mkdir "scripts\.gocache"
set GOCACHE=%~dp0.gocache
go run "%~dp0gen_keys.go"
