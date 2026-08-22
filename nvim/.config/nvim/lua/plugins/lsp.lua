return {
	"williamboman/mason.nvim",
	dependencies = {
		"williamboman/mason-lspconfig.nvim",
		"neovim/nvim-lspconfig",
		"hrsh7th/nvim-cmp",
		"hrsh7th/cmp-buffer",
		"hrsh7th/cmp-nvim-lsp",
		"hrsh7th/cmp-path",
		"L3MON4D3/LuaSnip",
		"saadparwaiz1/cmp_luasnip",
	},
	config = function()
		local mason = require("mason")
		local mason_lspconfig = require("mason-lspconfig")
		local cmp = require("cmp")
		local luasnip = require("luasnip")

		-- All servers to enable. basedpyright is installed via npm
		-- (basedpyright-langserver on PATH); mason installs the rest.
		local servers = {
			"basedpyright",
			"ruff",
			"clangd",
		}

		-- Servers mason should install. basedpyright is omitted because
		-- its mason build needs python venv/ensurepip; the npm package
		-- avoids that.
		local mason_servers = {
			"ruff",
			"clangd",
		}

		mason.setup({
			ui = {
				icons = {
					package_installed = "✓",
					package_pending = "➜",
					package_uninstalled = "✗",
				},
			},
		})

		mason_lspconfig.setup({
			ensure_installed = mason_servers,
			automatic_installation = true,
		})

		-- basedpyright defaults to a strict mode that warns on nearly every
		-- line (missing annotations, unknown types). "basic" keeps real type
		-- errors and drops most of the noise; use "off" to disable type
		-- checking entirely and let ruff handle linting.
		vim.lsp.config("basedpyright", {
			settings = {
				basedpyright = {
					analysis = {
						typeCheckingMode = "basic",
						diagnosticSeverityOverrides = {
							reportMissingTypeStubs = "none",
							reportUnknownMemberType = "none",
							reportUnknownVariableType = "none",
							reportUnknownArgumentType = "none",
							reportUnknownParameterType = "none",
							reportMissingParameterType = "none",
						},
					},
				},
			},
		})

		vim.lsp.enable(servers)

		vim.api.nvim_create_autocmd("LspAttach", {
			callback = function(event)
				local client = vim.lsp.get_client_by_id(event.data.client_id)
				local opts = { buffer = event.buf }
				local builtin = require("telescope.builtin")

				vim.keymap.set("n", "<leader>gd", builtin.lsp_definitions, opts)
				vim.keymap.set("n", "<leader>go", builtin.lsp_type_definitions, opts)
				vim.keymap.set("n", "<leader>gD", vim.lsp.buf.declaration, opts)
				vim.keymap.set("n", "<leader>gi", builtin.lsp_implementations, opts)
				vim.keymap.set("n", "<leader>gr", builtin.lsp_references, opts)
				vim.keymap.set("n", "<leader>gs", vim.lsp.buf.signature_help, opts)
				vim.keymap.set("n", "<leader>gS", builtin.lsp_document_symbols, opts)
				vim.keymap.set("n", "<leader>gW", builtin.lsp_workspace_symbols, opts)
				vim.keymap.set("n", "<leader>rn", vim.lsp.buf.rename, opts)
				vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
				vim.keymap.set("n", "<leader>dd", builtin.diagnostics, opts)

				-- Toggle Diagnostics
				vim.keymap.set('n', '<leader>td', function() vim.diagnostic.enable(not vim.diagnostic.is_enabled()) end)

				if client:supports_method("textDocument/formatting") then
					vim.keymap.set("n", "<leader>f", function()
						vim.lsp.buf.format({ async = true })
					end, opts)
				else
					vim.keymap.set("n", "<leader>f", function()
						require("notify")("Formatting not supported by current LSP", "error", {
							title = "LSP Warning",
							timeout = 2000
						})
						return ""
					end, opts)
				end
			end,
		})

		-- Trigger hover documentation after updatetime
		-- vim.opt.updatetime = 2000
		-- vim.api.nvim_create_autocmd("CursorHold", {
		-- 	pattern = "*",
		-- 	callback = function()
		-- 		vim.lsp.buf.hover()
		-- 	end,
		-- })

		-- Autocompletion Setup
		cmp.setup({
			snippet = {
				expand = function(args)
					luasnip.lsp_expand(args.body)
				end,
			},
			window = {
				completion = cmp.config.window.bordered(),
				documentation = cmp.config.window.bordered(),
			},
			mapping = cmp.mapping.preset.insert({
				["<C-Space>"] = cmp.mapping.complete(),
				["<CR>"] = cmp.mapping.confirm({ select = true }),
			}),
			sources = cmp.config.sources({
				{ name = "nvim_lsp" },
				{ name = "luasnip" },
				{ name = "path" },
				{ name = "buffer" },
			}),
		})

		vim.diagnostic.config({
			virtual_text = true,
			-- virtual_lines = true, -- multiline diagnostics
			signs = true,
			underline = true,
			update_in_insert = false,
			severity_sort = true
		})
	end,
}
