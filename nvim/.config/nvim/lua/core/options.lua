local opt = vim.opt

opt.termguicolors = true

-- Enable numbers on side
opt.number = true
opt.relativenumber = true

-- Enable mouse mode
opt.mouse = "a"

opt.showmode = false

-- Number of tabs when using in Insert
opt.sts = 4
opt.shiftwidth = 4
opt.tabstop = 4

-- Enable break indent
opt.breakindent = true

-- Make searching case-insensitive unless specified
opt.ignorecase = true
opt.smartcase = true

-- Decrease mapped sequence wait time
-- Displays which-key popup sooner
opt.timeoutlen = 1000

-- Configure how new splits should be opened
opt.splitright = true
opt.splitbelow = true

-- Sets how neovim will display certain whitespace characters in the editor.
--  See `:help 'list'`
--  and `:help 'listchars'`
opt.list = true
opt.listchars = { tab = "» ", trail = "·", nbsp = "␣" }

-- Preview substitutions live, as you type!
opt.inccommand = "split"

-- Minimal number of screen lines to keep above and below the cursor.
opt.scrolloff = 10

-- Show which line your cursor is on
opt.cursorline = true

-- Fuck swapfiles
opt.swapfile = false

-- Make a backup when editing a file, put it in .nvimTmp/backupdir
local backupdir = os.getenv("HOME") .. "/.nvimTmp/backupdir"
vim.fn.mkdir(backupdir, "p")
opt.backup = true
vim.opt_global.backupdir = backupdir
opt.backupcopy = "auto"

opt.autoread = true
vim.api.nvim_create_autocmd({ "FocusGained", "BufEnter", "CursorHold", "CursorHoldI" }, {
  pattern = "*",
  callback = function()
    if vim.fn.mode() ~= "c" and vim.fn.getcmdwintype() == "" then
      vim.cmd("checktime")
    end
  end,
})
vim.api.nvim_create_autocmd("FileChangedShellPost", {
  pattern = "*",
  callback = function()
    vim.notify("file reloaded from disk", vim.log.levels.INFO)
  end,
})
