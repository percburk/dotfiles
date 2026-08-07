return {
  "mfussenegger/nvim-lint",
  optional = true,
  opts = function(_, opts)
    local parser = require("lint.linters.markdownlint-cli2").parser

    opts.linters = opts.linters or {}
    opts.linters["markdownlint-cli2"] = {
      parser = function(...)
        return vim.tbl_filter(function(diagnostic)
          return not diagnostic.message:find("MD013/line%-length")
        end, parser(...))
      end,
    }
  end,
}
