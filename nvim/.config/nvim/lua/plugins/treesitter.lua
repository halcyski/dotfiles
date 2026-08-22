return {
    "nvim-treesitter/nvim-treesitter",
    branch = "master",
    build = ":TSUpdate",
    config = function ()
      local configs = require("nvim-treesitter.configs")

      configs.setup({
          ensure_installed = {
            "c", "cpp", "lua", "rust", "python", "haskell", "vhdl",
            "bash", "json", "yaml", "toml", "markdown", "markdown_inline",
            "html", "css", "javascript", "typescript", "tsx",
            "vim", "vimdoc", "query", "regex", "diff", "gitcommit",
          },
          sync_install = false,
          auto_install = true,
          highlight = { enable = true },
          indent = { enable = true },
        })
    end
 }
