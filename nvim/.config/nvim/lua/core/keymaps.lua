vim.g.mapleader = " "

-- Indentation keybinds for normal and visual mode
vim.keymap.set("v", "<Tab>", ">>", { desc = "Indent" })
vim.keymap.set("v", "<S-Tab>", "<<", { desc = "Outdent" })
vim.keymap.set("n", "<Tab>", ">>", { desc = "Indent" })
vim.keymap.set("n", "<S-Tab>", "<<", { desc = "Outdent" })

-- Keys to switch between buffers
vim.keymap.set("n", "<S-Right>", "<cmd>bnext<cr>", { desc = "Next buffer" })
vim.keymap.set("n", "<S-Left>", "<cmd>bprev<cr>", { desc = "Previous buffer" })
vim.keymap.set("n", "<S-D>", "<cmd>bw<cr>", { desc = "Wipeout buffer" })

-- Yank to system clipboard
vim.keymap.set("n", "<leader>y", '"+y', { desc = "Yank motion to clipboard" })
vim.keymap.set("v", "<leader>y", '"+y', { desc = "Yank selection to clipboard" })
vim.keymap.set("n", "<leader>Y", '"+Y', { desc = "Yank line to clipboard" })
vim.keymap.set("n", "<leader>yy", '"+yy', { desc = "Yank line to clipboard" })
