return {
  "neovim/nvim-lspconfig",
  opts = function(_, opts)
    opts.inlay_hints = opts.inlay_hints or {}
    opts.inlay_hints.enabled = false

    opts.servers = opts.servers or {}
    opts.servers.omnisharp = opts.servers.omnisharp or {}
    local omnisharp = opts.servers.omnisharp

    -- OmniSharp's virtual /$metadata$/ documents are incompatible with standard LSP navigation
    -- and highlighting, causing blank buffers, invalid jumps, and duplicate rootless clients.
    -- Require a workspace and use metadata-aware navigation that `omnisharp_extended` provides.
    -- See https://github.com/OmniSharp/omnisharp-roslyn/issues/2238
    omnisharp.workspace_required = true
    omnisharp.keys = omnisharp.keys or {}
    vim.list_extend(omnisharp.keys, {
      {
        "gr",
        function()
          require("omnisharp_extended").telescope_lsp_references()
        end,
        desc = "References",
      },
      {
        "gI",
        function()
          require("omnisharp_extended").telescope_lsp_implementation()
        end,
        desc = "Goto Implementation",
      },
      {
        "gy",
        function()
          require("omnisharp_extended").telescope_lsp_type_definition()
        end,
        desc = "Goto T[y]pe Definition",
      },
    })
  end,
}
