#!/bin/bash
echo '开始制作dmg文件...'
dropdmg ./build/McLauncher-darwin-x64/McLauncher.app && echo 'dmg制作完成！'
open ./build/McLauncher-darwin-x64/
