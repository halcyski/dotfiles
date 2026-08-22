return {
	"folke/which-key.nvim",
	event = "VeryLazy",
	opts = {
		delay = 300,
		icons = {
			mappings = false,
		},
		spec = {
			{ "<leader>g", group = "goto" },
			{ "<leader>p", group = "picker" },
			{ "<leader>t", group = "toggle" },
			{ "<leader>y", group = "yank" },
		},
	},
}
