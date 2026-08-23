local languages = {
    "c",
    "cpp",
    "lua",
    "rust",
    "python",
    "haskell",
    "vhdl",
    "bash",
    "json",
    "yaml",
    "toml",
    "markdown",
    "markdown_inline",
    "html",
    "css",
    "javascript",
    "typescript",
    "tsx",
    "vim",
    "vimdoc",
    "query",
    "regex",
    "diff",
    "gitcommit",
}

return {
    "nvim-treesitter/nvim-treesitter",
    branch = "main",
    lazy = false,
    build = function()
        if vim.fn.executable("tree-sitter") == 1 then
            require("nvim-treesitter").update():wait(300000)
        else
            vim.notify("tree-sitter CLI not found; skipping nvim-treesitter parser update", vim.log.levels.WARN)
        end
    end,
    config = function()
        local parser_dir = vim.fs.normalize(vim.fs.dirname(vim.uv.fs_realpath(vim.v.progpath)) .. "/../lib/nvim/parser")
        for _, language in ipairs({ "c", "lua", "markdown", "markdown_inline", "query", "vim", "vimdoc" }) do
            local parser = parser_dir .. "/" .. language .. ".so"
            if vim.uv.fs_stat(parser) then
                vim.treesitter.language.add(language, { path = parser })
            end
        end

        require("nvim-treesitter").setup({
            install_dir = vim.fn.stdpath("data") .. "/site",
        })

        if vim.fn.executable("tree-sitter") == 1 then
            require("nvim-treesitter").install(languages)
        end

        vim.api.nvim_create_autocmd("FileType", {
            pattern = languages,
            callback = function(args)
                pcall(vim.treesitter.start, args.buf)
            end,
        })
    end,
}
