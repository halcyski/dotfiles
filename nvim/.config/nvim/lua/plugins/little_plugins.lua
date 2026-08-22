return {
	"romainl/vim-cool",
	"rcarriga/nvim-notify",
	{
		"mrcjkb/haskell-tools.nvim",
		version = "^6",
		ft = { "haskell", "lhaskell", "cabal", "cabalproject" },
	},
	{
		"hat0uma/csvview.nvim",
		---@module "csvview"
		---@type CsvView.Options
		opts = {
			parser = { comments = { "#", "//" } },
			keymaps = {
				textobject_field_inner = { "if", mode = { "o", "x" } },
				textobject_field_outer = { "af", mode = { "o", "x" } },
				jump_next_field_end = { "<Tab>", mode = { "n", "v" } },
				jump_prev_field_end = { "<S-Tab>", mode = { "n", "v" } },
				jump_next_row = { "<Enter>", mode = { "n", "v" } },
				jump_prev_row = { "<S-Enter>", mode = { "n", "v" } },
			},
		},
		cmd = { "CsvViewEnable", "CsvViewDisable", "CsvViewToggle" },
	},
	{
		"stevearc/oil.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		config = function()
			require("oil").setup({
				view_options = {
					show_hidden = true,
				},
			})
			vim.keymap.set("n", "-", "<cmd>Oil<cr>", { desc = "Open parent directory" })
		end,
	},
	{
		"lewis6991/gitsigns.nvim",
		event = { "BufReadPre", "BufNewFile" },
		opts = {
			signs = {
				add = { text = "│" },
				change = { text = "│" },
				delete = { text = "_" },
				topdelete = { text = "‾" },
				changedelete = { text = "~" },
			},
			on_attach = function(bufnr)
				local gs = package.loaded.gitsigns
				local opts = { buffer = bufnr }

				vim.keymap.set("n", "]h", gs.next_hunk, opts)
				vim.keymap.set("n", "[h", gs.prev_hunk, opts)
				vim.keymap.set("n", "<leader>hs", gs.stage_hunk, opts)
				vim.keymap.set("n", "<leader>hr", gs.reset_hunk, opts)
				vim.keymap.set("n", "<leader>hp", gs.preview_hunk, opts)
				vim.keymap.set("n", "<leader>hb", gs.blame_line, opts)
			end,
		},
	},
	{
		"windwp/nvim-autopairs",
		event = "InsertEnter",
		opts = {},
	},
	{
		"folke/trouble.nvim",
		dependencies = { "nvim-tree/nvim-web-devicons" },
		cmd = "Trouble",
		keys = {
			{ "<leader>xx", "<cmd>Trouble diagnostics toggle<cr>", desc = "Diagnostics (Trouble)" },
			{ "<leader>xX", "<cmd>Trouble diagnostics toggle filter.buf=0<cr>", desc = "Buffer Diagnostics (Trouble)" },
			{ "<leader>xl", "<cmd>Trouble loclist toggle<cr>", desc = "Location List (Trouble)" },
			{ "<leader>xq", "<cmd>Trouble qflist toggle<cr>", desc = "Quickfix List (Trouble)" },
		},
		opts = {},
	},
}
