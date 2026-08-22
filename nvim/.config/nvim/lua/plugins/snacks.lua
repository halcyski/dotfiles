return {
  "folke/snacks.nvim",
  priority = 1000,
  lazy = false,
  ---@type snacks.Config
  opts = {
    bigfile = { enabled = true },
    -- animate/scroll break Telescope's result-window redraw on nvim 0.12
    -- (list populates but does not paint until you press an arrow key).
    animate = { enabled = false },
    dashboard = { enabled = false },
    explorer = { enabled = false },
    indent = { enabled = true },
	input = { enabled = true },
    picker = { enabled = true },
    notifier = { enabled = true },
    quickfile = { enabled = true },
    scope = { enabled = true },
    scroll = { enabled = false },
    statuscolumn = { enabled = true },
    words = { enabled = true },
  },
}
