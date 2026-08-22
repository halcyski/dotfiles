return {
    "nvim-telescope/telescope.nvim",
    dependencies = { "nvim-lua/plenary.nvim", "sharkdp/fd" },
    opts = {
        version = "0.1.x",
    },
    config = function(opts)
        require('telescope').setup {
            defaults = {
				find_command = {'rg', '--hidden', '--files', '--follow'},
				vimgrep_arguments = {
					  "rg",
					  "--follow",        -- Follow symbolic links
					  "--hidden",        -- Search for hidden files
					  "--no-heading",    -- Don't group matches by each file
					  "--with-filename", -- Print the file path with the matched lines
					  "--line-number",   -- Show line numbers
					  "--column",        -- Show column numbers
					  "--smart-case",    -- Smart case search

					  -- Exclude some patterns from search
					  "--glob=!**/.git/*",
					  "--glob=!**/.idea/*",
					  "--glob=!**/.vscode/*",
					  "--glob=!**/build/*",
					  "--glob=!**/dist/*",
					  "--glob=!**/yarn.lock",
					  "--glob=!**/package-lock.json",
					},
            },
			pickers = {
				find_files = {
				  hidden = true,
				  find_command = {
					"rg",
					"--files",
					"--follow",
					"--hidden",
					"--glob=!**/.git/*",
					"--glob=!**/.idea/*",
					"--glob=!**/.vscode/*",
					"--glob=!**/build/*",
					"--glob=!**/dist/*",
					"--glob=!**/yarn.lock",
					"--glob=!**/package-lock.json",
				  },
				},
			  },
        }

        local builtin = require("telescope.builtin")
        vim.keymap.set("n", "<leader>pf", builtin.find_files, {})
        vim.keymap.set("n", "<leader>ps", builtin.live_grep, {})
        vim.keymap.set("n", "<leader>pb", builtin.buffers, {})
		vim.keymap.set("n" ,"<leader>pt","<cmd>Telescope colorscheme<cr>",{desc="Pick a colorscheme from the Telescope menu"})
    end
}

