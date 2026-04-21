@echo off
call "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat" -no_logo
cd /d "C:\Users\johnd\Documents\portfolio projects\file_integrity_checker\node_modules\better-sqlite3"
echo Building better-sqlite3...
node "..\..\node_modules\node-gyp\bin\node-gyp.js" rebuild --release
echo Exit code: %errorlevel%
