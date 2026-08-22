vim.api.nvim_create_autocmd("BufEnter", { command = [[set formatoptions-=cro]] })

-- Auto-enable csvview for CSV files under 1MB
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
  pattern = "*.csv",
  callback = function()
    local max_filesize = 1024 * 1024 -- 1MB
    local ok, stats = pcall(vim.loop.fs_stat, vim.api.nvim_buf_get_name(0))
    if ok and stats and stats.size < max_filesize then
      require("csvview").enable()
    end
  end,
})

vim.api.nvim_create_autocmd({ "BufLeave" }, {
  pattern = "*.csv",
  callback = function()
    require("csvview").disable()
  end,
})
