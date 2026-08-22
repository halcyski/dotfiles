return {
	"nvimdev/dashboard-nvim",
	lazy = false,
	opts = function()

		local pikachu_logo = [[
              ▀████▀▄▄              ▄█
                █▀    ▀▀▄▄▄▄▄   ▄▄▄▀▀█
        ▄        █          ▀▀▀▀   ▄▀
       ▄▀▀▀▄      ▀▄              ▀▄▀
      ▄▀    █     █▀   ▄█▀▄      ▄█
      ▀▄     ▀▄  █     ▀██▀     ██▄█
       ▀▄    ▄▀ █   ▄██▄   ▄  ▄  ▀▀ █
        █  ▄▀  █    ▀██▀    ▀▀ ▀▀  ▄▀
       █   █  █                   ▄▀
    ]]

		local logo = string.rep("\n", 8) .. pikachu_logo .. "\n\n"

		local telescope = require("telescope.builtin")
		local opts = {
			theme = "doom",
			hide = {
				statusline = false, -- Don't enable, messes up lualine
			},
			config = {
				header = vim.split(logo, "\n"),

				center = {
					{ action = function() telescope.find_files() end, desc = " Find File", icon = "󰍉 ", key = "f" },
					{ action = function() telescope.live_grep() end, desc = " Find Text", icon = "󱎸 ", key = "g" },
					{ action = "ene | startinsert", desc = " New File", icon = " ", key = "n" },
					{ action = function() vim.api.nvim_input("<cmd>Lazy<cr>") end, desc = " Open Lazy", icon = "󰒲 ", key = "l" },
					{ action = function() vim.api.nvim_input("<cmd>qa<cr>") end, desc = " Quit", icon = " ", key = "q" },
				},
				footer = function()
					local stats = require("lazy").stats()
					local ms = (math.floor(stats.startuptime * 100 + 0.5) / 100)
					return { "⚡ Neovim loaded " .. stats.loaded .. "/" .. stats.count .. " plugins in " .. ms .. "ms" }
				end,
			},
		}
		return opts
	end,
}
