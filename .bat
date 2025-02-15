@echo off
start /b cmd /c "cd server && bun run dev"
start /b cmd /c "cd client && bun run dev --host"
perfmon /res
pause
