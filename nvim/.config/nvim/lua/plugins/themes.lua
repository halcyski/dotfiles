return {

	-- Themes
	"rebelot/kanagawa.nvim",
	"sho-87/kanagawa-paper.nvim",
	"neanias/everforest-nvim",
	"projekt0n/github-nvim-theme",
	"EdenEast/nightfox.nvim",
	"comfysage/evergarden",
	"rose-pine/neovim",
	{
		"catppuccin/nvim",
		name = "catppuccin",
		lazy = false,
		priority = 1000,
		config = function()
			-- default theme; last-color (see init.lua) restores the last
			-- picked one on subsequent sessions.
			pcall(vim.cmd.colorscheme, "catppuccin")
		end,
	},
	'everviolet/nvim',

	-- Plugin to remember last picked theme
	"raddari/last-color.nvim",

	version = false,
	lazy = false,
	priority = 1000,
}
