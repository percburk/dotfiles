local lockfiles = { "package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb", "bun.lock" }
local native_tsc_cache = {} ---@type table<string, string|false>

--- Returns the project's `tsc` if it is TypeScript 7+, the first release with `--lsp`
---@param root string
---@return string|false
local function native_tsc(root)
  if native_tsc_cache[root] == nil then
    local bin = vim.fs.joinpath(root, "node_modules/.bin/tsc")
    local version = vim.fn.executable(bin) == 1
      and vim.version.parse(vim.system({ bin, "--version" }, { text = true }):wait().stdout or "")
    native_tsc_cache[root] = version and version.major >= 7 and bin or false
  end
  return native_tsc_cache[root]
end

---@param bufnr integer
local function ts_root(bufnr)
  return vim.fs.root(bufnr, { lockfiles, ".git" }) or vim.fn.getcwd()
end

return {
  "neovim/nvim-lspconfig",
  opts = function(_, opts)
    opts.inlay_hints = opts.inlay_hints or {}
    opts.inlay_hints.enabled = false

    opts.servers = opts.servers or {}

    -- TypeScript 7 projects get the native `tsc` server; older projects keep vtsls
    opts.servers.tsc = vim.tbl_deep_extend("force", opts.servers.tsc or {}, {
      enabled = true,
      -- `cmd` only runs the project's own binary, so a Mason install would go unused
      mason = false,
      root_dir = function(bufnr, on_dir)
        local root = ts_root(bufnr)
        if native_tsc(root) then
          on_dir(root)
        end
      end,
      cmd = function(dispatchers, config)
        return vim.lsp.rpc.start({ native_tsc(config.root_dir), "--lsp", "--stdio" }, dispatchers)
      end,
    })
    opts.servers.vtsls = opts.servers.vtsls or {}
    opts.servers.vtsls.root_dir = function(bufnr, on_dir)
      local root = ts_root(bufnr)
      if not native_tsc(root) then
        on_dir(root)
      end
    end

    opts.servers.codebook = opts.servers.codebook or {}
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
