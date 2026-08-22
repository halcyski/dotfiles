require("core")

local ok, last_color = pcall(require, 'last-color')
local theme = (ok and last_color.recall()) or 'catppuccin'
pcall(vim.cmd.colorscheme, theme)
