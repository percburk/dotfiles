return {
  "stevearc/conform.nvim",
  optional = true,
  ---@param opts ConformOpts
  opts = function(_, opts)
    opts.formatters = opts.formatters or {}
    opts.formatters.prettier = vim.tbl_deep_extend("force", opts.formatters.prettier or {}, {
      append_args = {
        "--config-precedence",
        "prefer-file",
        "--print-width",
        "88",
        "--no-semi",
        "--trailing-comma",
        "es5",
        "--single-quote",
      },
    })
  end,
}
