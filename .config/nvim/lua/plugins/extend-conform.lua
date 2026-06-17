return {
  "stevearc/conform.nvim",
  optional = true,
  ---@param opts ConformOpts
  opts = function(_, opts)
    local prettier_args = {
      "--config-precedence",
      "prefer-file",
      "--print-width",
      "88",
      "--no-semi",
      "--trailing-comma",
      "es5",
      "--single-quote",
    }

    local function first(bufnr, ...)
      local conform = require("conform")
      for i = 1, select("#", ...) do
        local formatter = select(i, ...)
        if conform.get_formatter_info(formatter, bufnr).available then
          return formatter
        end
      end
      return select(1, ...)
    end

    local function prefer_prettierd(formatters)
      return function(bufnr)
        local ret = {}
        for key, value in pairs(formatters) do
          if type(key) ~= "number" then
            ret[key] = value
          end
        end
        for _, formatter in ipairs(formatters) do
          table.insert(ret, formatter == "prettier" and first(bufnr, "prettierd", "prettier") or formatter)
        end
        return ret
      end
    end

    opts.formatters_by_ft = opts.formatters_by_ft or {}
    for ft, formatters in pairs(opts.formatters_by_ft) do
      if type(formatters) == "table" and vim.tbl_contains(formatters, "prettier") then
        opts.formatters_by_ft[ft] = prefer_prettierd(formatters)
      end
    end

    opts.formatters = opts.formatters or {}
    for _, formatter in ipairs({ "prettierd", "prettier" }) do
      opts.formatters[formatter] = vim.tbl_deep_extend("force", opts.formatters[formatter] or {}, {
        append_args = prettier_args,
      })
    end
  end,
}
