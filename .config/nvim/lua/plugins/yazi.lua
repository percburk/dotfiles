---@type LazySpec
return {
  "mikavilpas/yazi.nvim",
  version = "*",
  event = "VeryLazy",
  dependencies = {
    { "nvim-lua/plenary.nvim", lazy = true },
  },
  keys = {
    {
      "<leader>e",
      "<cmd>Yazi<cr>",
      desc = "Open yazi at the current file",
    },
    {
      "<leader>E",
      "<cmd>Yazi cwd<cr>",
      desc = "Open the file manager in nvim's working directory",
    },
    {
      "<leader>-",
      "<cmd>Yazi toggle<cr>",
      desc = "Resume the last yazi session",
    },
  },
  ---@type YaziConfig | {}
  opts = {
    open_for_directories = true,
    keymaps = {
      show_help = "<f1>",
    },
  },
  init = function()
    -- mark netrw as loaded so it's not loaded at all.
    -- More details: https://github.com/mikavilpas/yazi.nvim/issues/802
    vim.g.loaded_netrwPlugin = 1
  end,
}
